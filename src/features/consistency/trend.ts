import { addDays, isBefore, type DateString } from '@/lib/date';
import { computeRangeRatio, startOfWeek, type DayStatusResolver } from '@/features/consistency/streak';

export interface TrendWeek {
  /** Monday of the week, as a date string. */
  weekStart: DateString;
  /** Days fully complete, out of days that had anything scheduled. */
  completed: number;
  total: number;
  /** `null` when nothing was scheduled all week — a gap, not a zero. */
  ratio: number | null;
  /** The week containing `currentDate`, which is still in progress. */
  isCurrent: boolean;
}

/**
 * Adherence week by week, oldest first — the "am I getting better or worse?" view.
 *
 * A streak answers neither of the questions someone actually has. It's binary, it's erased by
 * one ordinary bad day, and it says nothing about direction. A trend shows whether the last
 * month beat the one before it, which is the thing worth knowing on a treatment measured in
 * months.
 *
 * Weeks with nothing scheduled return `ratio: null` rather than 0. A week you were paused, or
 * before you started, is a gap in the data — drawing it as a zero would read as a failure, and
 * the whole product avoids inventing failures.
 *
 * **Bounded by construction:** it walks back a fixed `weeks` count and stops at `earliestDate`.
 * Any backwards date walk here needs a lower bound — an unbounded one once ran to the year 1479
 * and froze the app (see CLAUDE.md).
 */
export function computeWeeklyTrend(
  currentDate: DateString,
  earliestDate: DateString | null,
  dayStatus: DayStatusResolver,
  weeks = 8
): TrendWeek[] {
  if (earliestDate === null || weeks <= 0) return [];

  const currentWeekStart = startOfWeek(currentDate);
  const result: TrendWeek[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -7 * i);
    // Don't invent weeks from before the user started.
    if (isBefore(weekStart, earliestDate) && isBefore(addDays(weekStart, 6), earliestDate)) {
      continue;
    }

    const weekEnd = addDays(weekStart, 6);
    // computeRangeRatio caps at currentDate, so the in-flight week isn't scored on days
    // that haven't happened yet.
    const { completed, total } = computeRangeRatio(weekStart, weekEnd, currentDate, dayStatus);

    result.push({
      weekStart,
      completed,
      total,
      ratio: total === 0 ? null : completed / total,
      isCurrent: weekStart === currentWeekStart,
    });
  }

  return result;
}

/**
 * Which scheduled time gets missed most — "you skip the 8pm dose twice as often as the 8am one".
 *
 * The single most actionable thing this data can say, because the fix is concrete: move the
 * reminder, or move the dose. Ordered worst-first so the problem time is the first thing read.
 */
export interface TimeOfDayStat {
  time: string; // 'HH:MM'
  taken: number;
  total: number;
}

export function computeTimeOfDayStats(
  scheduled: { time: string; taken: boolean }[]
): TimeOfDayStat[] {
  const byTime = new Map<string, TimeOfDayStat>();

  for (const dose of scheduled) {
    const stat = byTime.get(dose.time) ?? { time: dose.time, taken: 0, total: 0 };
    stat.total += 1;
    if (dose.taken) stat.taken += 1;
    byTime.set(dose.time, stat);
  }

  return [...byTime.values()].sort((a, b) => {
    const aRate = a.total === 0 ? 1 : a.taken / a.total;
    const bRate = b.total === 0 ? 1 : b.taken / b.total;
    if (aRate !== bRate) return aRate - bRate; // worst first
    return a.time.localeCompare(b.time);
  });
}
