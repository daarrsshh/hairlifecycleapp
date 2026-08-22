import type { DayStatus } from '@/features/dose-log/doseState';
import { addDays, isBefore, type DateString } from '@/lib/date';

export type DayStatusResolver = (date: DateString) => DayStatus;

/**
 * Current streak counts consecutive `complete` days walking back from today.
 * `no-treatment` days (before a plan started, or while paused) are skipped rather than
 * breaking the streak — pausing freezes progress, it doesn't punish it (PRD §9).
 * If today is still `in-progress`, it's skipped too — an unfinished today shouldn't zero
 * out yesterday's streak while there's still time left to log.
 */
export function computeCurrentStreak(currentDate: DateString, dayStatus: DayStatusResolver): number {
  let streak = 0;
  let cursor = currentDate;
  let isToday = true;

  while (true) {
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

export interface SlotBreakdown {
  taken: number;
  total: number;
}

/** Per-slot (AM vs PM) taken/required counts over a date range, for the Consistency screen's AM vs. PM breakdown. */
export function computeSlotBreakdown(
  fromDate: DateString,
  toDate: DateString,
  slot: 'am' | 'pm',
  currentDate: DateString,
  requiredSlotsFor: (date: DateString) => ('am' | 'pm')[],
  effectiveStateFor: (date: DateString, slot: 'am' | 'pm') => string
): SlotBreakdown {
  let taken = 0;
  let total = 0;
  let cursor = fromDate;

  while (!isBefore(toDate, cursor) && !isBefore(currentDate, cursor)) {
    if (requiredSlotsFor(cursor).includes(slot)) {
      const state = effectiveStateFor(cursor, slot);
      if (state !== 'pending') {
        total++;
        if (state === 'taken') taken++;
      }
    }
    cursor = addDays(cursor, 1);
  }

  return { taken, total };
}
