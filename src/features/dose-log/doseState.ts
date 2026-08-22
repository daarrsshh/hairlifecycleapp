import { isBefore } from '@/lib/date';
import type { DateString } from '@/lib/date';

export type DoseSlot = 'am' | 'pm';
export type DoseState = 'pending' | 'taken' | 'skipped' | 'missed';

export interface DoseLogRecord {
  date: DateString;
  slot: DoseSlot;
  state: DoseState;
  locked: boolean;
  respondedAt: string | null;
}

/** Taken/Skipped lock immediately; Missed stays editable since it reflects absence of input, not a deliberate answer (PRD §5.2). */
export function isEditable(log: Pick<DoseLogRecord, 'locked'> | undefined): boolean {
  return !log?.locked;
}

/**
 * The state to *display* for a required slot, reconciling a stale/missing row against
 * "today" without needing a background job: any unresolved slot from a past day reads
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

/**
 * A "No" response gets a one-off re-prompt 6 hours later, but only if that lands within
 * the same calendar day and no earlier than 10:00 — never overnight (PRD §8).
 */
export function computeRepromptTime(respondedAt: Date): Date | null {
  const candidate = new Date(respondedAt.getTime() + 6 * 60 * 60 * 1000);
  const sameDay =
    candidate.getFullYear() === respondedAt.getFullYear() &&
    candidate.getMonth() === respondedAt.getMonth() &&
    candidate.getDate() === respondedAt.getDate();
  if (!sameDay) return null;
  if (candidate.getHours() < 10) return null;
  return candidate;
}

export interface TreatmentPeriodRange {
  id: string;
  startDate: DateString;
  endDate: DateString | null;
}

export interface PauseWindow {
  treatmentPeriodId: string;
  pausedAt: DateString;
  resumedAt: DateString | null;
}

export interface DrugSlotConfig {
  treatmentPeriodId: string;
  slot: DoseSlot | 'both';
}

function isPausedOnDate(periodId: string, date: DateString, pauseWindows: PauseWindow[]): boolean {
  return pauseWindows.some(
    (w) =>
      w.treatmentPeriodId === periodId &&
      !isBefore(date, w.pausedAt) &&
      (w.resumedAt === null || isBefore(date, w.resumedAt))
  );
}

/** Which treatment period (if any) covered a given date — a past date can fall under a since-ended period. */
export function findPeriodForDate<T extends TreatmentPeriodRange>(
  periods: T[],
  date: DateString
): T | undefined {
  return periods.find(
    (p) => !isBefore(date, p.startDate) && (p.endDate === null || !isBefore(p.endDate, date))
  );
}

/** Which slots (if any) a user was actually expected to log on a given date — empty before/after any period, or during a pause. */
export function getRequiredSlots(
  date: DateString,
  periods: TreatmentPeriodRange[],
  pauseWindows: PauseWindow[],
  drugs: DrugSlotConfig[]
): DoseSlot[] {
  const period = findPeriodForDate(periods, date);
  if (!period) return [];
  if (isPausedOnDate(period.id, date, pauseWindows)) return [];

  const slots = new Set<DoseSlot>();
  for (const drug of drugs) {
    if (drug.treatmentPeriodId !== period.id) continue;
    if (drug.slot === 'both') {
      slots.add('am');
      slots.add('pm');
    } else {
      slots.add(drug.slot);
    }
  }
  return [...slots];
}

export type DayStatus = 'no-treatment' | 'in-progress' | 'complete' | 'incomplete';

/**
 * Rolls a day's required slots up into one status. `in-progress` only ever applies to
 * `currentDate` itself — some required slot is still genuinely pending, not yet resolved.
 */
export function resolveDayStatus(
  date: DateString,
  requiredSlots: DoseSlot[],
  logsForDate: DoseLogRecord[],
  currentDate: DateString
): DayStatus {
  if (requiredSlots.length === 0) return 'no-treatment';

  const states = requiredSlots.map((slot) => {
    const log = logsForDate.find((l) => l.slot === slot);
    return computeEffectiveState(log, date, currentDate);
  });

  if (states.some((s) => s === 'missed' || s === 'skipped')) return 'incomplete';
  if (states.every((s) => s === 'taken')) return 'complete';
  return 'in-progress';
}
