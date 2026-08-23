import type { DayStatus } from '@/features/dose-log/doseState';
import { addDays, isBefore, type DateString } from '@/lib/date';

export type DayStatusResolver = (date: DateString) => DayStatus;

export interface RecentDay {
  date: DateString;
  status: DayStatus;
  isToday: boolean;
}

/**
 * The last `days` days ending today, oldest first — backs Home's week strip. Bounded by
 * construction, unlike the streak walk-back.
 */
export function computeRecentDays(
  currentDate: DateString,
  days: number,
  dayStatus: DayStatusResolver
): RecentDay[] {
  const result: RecentDay[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addDays(currentDate, -offset);
    result.push({ date, status: dayStatus(date), isToday: offset === 0 });
  }
  return result;
}

/**
 * Current streak counts consecutive `complete` days walking back from today.
 * `no-treatment` days (before a plan started, or while paused) are skipped rather than
 * breaking the streak — pausing freezes progress, it doesn't punish it (PRD §9).
 * If today is still `in-progress`, it's skipped too — an unfinished today shouldn't zero
 * out yesterday's streak while there's still time left to log.
 *
 * `earliestDate` (the first treatment period's start date, or null if there's no treatment
 * history) is a **required** lower bound, not an optimization: every date before it resolves
 * to `no-treatment`, which this loop skips past rather than breaking on. Without the bound the
 * walk-back never terminates for any user who has no `incomplete` day — a hard JS-thread
 * freeze that presents as a permanently black, totally unresponsive app.
 */
export function computeCurrentStreak(
  currentDate: DateString,
  dayStatus: DayStatusResolver,
  earliestDate: DateString | null
): number {
  if (earliestDate === null) return 0;

  let streak = 0;
  let cursor = currentDate;
  let isToday = true;

  while (!isBefore(cursor, earliestDate)) {
    const status = dayStatus(cursor);
    if (status === 'no-treatment' || (status === 'in-progress' && isToday)) {
      cursor = addDays(cursor, -1);
      isToday = false;
      continue;
    }
    if (status === 'complete') {
      streak++;
      cursor = addDays(cursor, -1);
      isToday = false;
      continue;
    }
    break; // incomplete
  }

  return streak;
}

/** Longest run of consecutive `complete` days from `fromDate` through `currentDate`, inclusive. */
export function computeBestStreak(
  fromDate: DateString,
  currentDate: DateString,
  dayStatus: DayStatusResolver
): number {
  let best = 0;
  let running = 0;
  let cursor = fromDate;

  while (!isBefore(currentDate, cursor)) {
    const status = dayStatus(cursor);
    if (status === 'complete') {
      running++;
      best = Math.max(best, running);
    } else if (status === 'incomplete') {
      running = 0;
    }
    cursor = addDays(cursor, 1);
  }

  return best;
}

export interface MonthRatio {
  completed: number;
  total: number;
}

/** "26 of 30 days" — deliberately a count, not a percentage (PRD §5.3). Only counts days that have actually elapsed and had a treatment active. */
export function computeRangeRatio(
  fromDate: DateString,
  toDate: DateString,
  currentDate: DateString,
  dayStatus: DayStatusResolver
): MonthRatio {
  let completed = 0;
  let total = 0;
  let cursor = fromDate;

  while (!isBefore(toDate, cursor) && !isBefore(currentDate, cursor)) {
    const status = dayStatus(cursor);
    if (status !== 'no-treatment' && status !== 'in-progress') {
      total++;
      if (status === 'complete') completed++;
    }
    cursor = addDays(cursor, 1);
  }

  return { completed, total };
}

export function computeMonthRatio(
  year: number,
  month: number, // 1-12
  currentDate: DateString,
  dayStatus: DayStatusResolver
): MonthRatio {
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  return computeRangeRatio(monthStart, monthEnd, currentDate, dayStatus);
}

export interface ItemConsistency {
  taken: number;
  total: number;
}

/**
 * Taken/scheduled counts for a single routine item over a date range — backs "LLLT: 3 of 3
 * this week". Replaces the old AM/PM split, which stopped meaning anything once items carry
 * their own schedules. Only counts doses that have actually resolved, so a still-pending
 * today doesn't drag the ratio down.
 */
export function computeItemConsistency(
  fromDate: DateString,
  toDate: DateString,
  itemId: string,
  currentDate: DateString,
  scheduledFor: (date: DateString) => { itemId: string; time: string }[],
  effectiveStateFor: (date: DateString, itemId: string, time: string) => string
): ItemConsistency {
  let taken = 0;
  let total = 0;
  let cursor = fromDate;

  while (!isBefore(toDate, cursor) && !isBefore(currentDate, cursor)) {
    for (const dose of scheduledFor(cursor)) {
      if (dose.itemId !== itemId) continue;
      const state = effectiveStateFor(cursor, itemId, dose.time);
      if (state !== 'pending') {
        total++;
        if (state === 'taken') taken++;
      }
    }
    cursor = addDays(cursor, 1);
  }

  return { taken, total };
}
