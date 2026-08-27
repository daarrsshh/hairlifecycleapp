import { isBefore } from '@/lib/date';
import type { DateString } from '@/lib/date';

export type RoutineItemType = 'oral' | 'topical' | 'device';
export type DoseState = 'pending' | 'taken' | 'skipped' | 'missed';

/** A dose log is keyed to a specific item *and* time, so "took the morning one, skipped the evening one" is representable. */
export interface DoseLogRecord {
  routineItemId: string;
  date: DateString;
  time: string; // 'HH:MM'
  state: DoseState;
  locked: boolean;
  respondedAt: string | null;
}

/** Taken/Skipped lock immediately; Missed stays editable since it reflects absence of input, not a deliberate answer (PRD §5.2). */
export function isEditable(log: Pick<DoseLogRecord, 'locked'> | undefined): boolean {
  return !log?.locked;
}

/**
 * The state to *display* for a scheduled dose, reconciling a stale/missing row against
 * "today" without needing a background job: any unresolved dose from a past day reads
 * as Missed even before a reconciliation pass has persisted that row.
 */
export function computeEffectiveState(
  log: DoseLogRecord | undefined,
  date: DateString,
  currentDate: DateString
): DoseState {
  if (log) {
    if (log.state === 'pending' && isBefore(date, currentDate)) return 'missed';
    return log.state;
  }
  return isBefore(date, currentDate) ? 'missed' : 'pending';
}

export interface RoutineRange {
  id: string;
  startDate: DateString;
  endDate: DateString | null;
}

export interface PauseWindow {
  routineId: string;
  pausedAt: DateString;
  resumedAt: DateString | null;
}

export interface RoutineItemSchedule {
  id: string;
  routineId: string;
  type: RoutineItemType;
  name: string;
  dosage: string | null;
  daysOfWeek: number[]; // 0 = Sunday … 6 = Saturday
  times: string[]; // 'HH:MM', one entry per time it's done on a scheduled day
}

/** One thing to log: a specific item at a specific time on a specific day. */
export interface ScheduledDose {
  itemId: string;
  time: string;
}

function isPausedOnDate(routineId: string, date: DateString, pauseWindows: PauseWindow[]): boolean {
  return pauseWindows.some(
    (w) =>
      w.routineId === routineId &&
      !isBefore(date, w.pausedAt) &&
      (w.resumedAt === null || isBefore(date, w.resumedAt))
  );
}

/**
 * Which routine (if any) covered a given date — a past date can fall under a since-ended routine.
 *
 * The interval is **half-open: `[startDate, endDate)`.** `startRoutine` ends the outgoing
 * routine by setting its `endDate` to the incoming one's `startDate`, so both name the switch
 * day; treating `endDate` as inclusive made both match it and the outgoing one won (it sorts
 * first by `startDate`). The visible effect was that a newly started routine did nothing at all
 * on the day it began. An exclusive end also reads correctly on its own terms: a routine that
 * "ended on the 24th" is one the 24th no longer belongs to.
 */
export function findRoutineForDate<T extends RoutineRange>(routines: T[], date: DateString): T | undefined {
  return routines.find(
    (r) => !isBefore(date, r.startDate) && (r.endDate === null || isBefore(date, r.endDate))
  );
}

export function dayOfWeek(date: DateString): number {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

/**
 * Everything the user was actually expected to do on a given date — empty before/after any
 * routine, during a pause, or on a day none of the items are scheduled for (e.g. a
 * Mon/Wed/Fri device on a Tuesday). Ordered by time, then by the item's own sort order.
 */
export function getScheduledDoses(
  date: DateString,
  routines: RoutineRange[],
  pauseWindows: PauseWindow[],
  items: RoutineItemSchedule[]
): ScheduledDose[] {
  const routine = findRoutineForDate(routines, date);
  if (!routine) return [];
  if (isPausedOnDate(routine.id, date, pauseWindows)) return [];

  const weekday = dayOfWeek(date);
  const doses: ScheduledDose[] = [];

  for (const item of items) {
    if (item.routineId !== routine.id) continue;
    if (!item.daysOfWeek.includes(weekday)) continue;
    for (const time of item.times) {
      doses.push({ itemId: item.id, time });
    }
  }

  return doses.sort((a, b) => a.time.localeCompare(b.time));
}

export type DayStatus = 'no-treatment' | 'in-progress' | 'complete' | 'incomplete';

export interface DayProgress {
  status: DayStatus;
  /** Doses logged as taken, out of everything scheduled that day — drives "5 of 6 today". */
  taken: number;
  total: number;
}

function findLog(logs: DoseLogRecord[], dose: ScheduledDose): DoseLogRecord | undefined {
  return logs.find((l) => l.routineItemId === dose.itemId && l.time === dose.time);
}

/**
 * Rolls a day's scheduled doses up into one status plus a taken/total count. `in-progress`
 * only ever applies to `currentDate` itself — some dose is still genuinely pending.
 */
export function resolveDayProgress(
  date: DateString,
  scheduled: ScheduledDose[],
  logsForDate: DoseLogRecord[],
  currentDate: DateString
): DayProgress {
  if (scheduled.length === 0) {
    return { status: 'no-treatment', taken: 0, total: 0 };
  }

  const states = scheduled.map((dose) => computeEffectiveState(findLog(logsForDate, dose), date, currentDate));
  const taken = states.filter((s) => s === 'taken').length;
  const total = states.length;

  if (states.some((s) => s === 'missed' || s === 'skipped')) {
    return { status: 'incomplete', taken, total };
  }
  if (taken === total) {
    return { status: 'complete', taken, total };
  }
  return { status: 'in-progress', taken, total };
}

/** Convenience wrapper for the many callers that only care about the rolled-up status. */
export function resolveDayStatus(
  date: DateString,
  scheduled: ScheduledDose[],
  logsForDate: DoseLogRecord[],
  currentDate: DateString
): DayStatus {
  return resolveDayProgress(date, scheduled, logsForDate, currentDate).status;
}
