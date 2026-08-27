import { useQuery } from '@tanstack/react-query';

import { db } from '@/db/client';
import { doseLogs } from '@/db/schema';
import { loadDosingContext } from '@/features/dose-log/api';
import {
  computeEffectiveState,
  findRoutineForDate,
  getScheduledDoses,
  resolveDayProgress,
  type DayStatus,
  type DoseLogRecord,
  type RoutineItemType,
  type ScheduledDose,
} from '@/features/dose-log/doseState';
import {
  computeCurrentStreak,
  computeItemConsistency,
  computeMonthRatio,
  computeRangeRatio,
  computeCalendarWeek,
  startOfWeek,
  type DayStatusResolver,
  type WeekDay,
} from '@/features/consistency/streak';
import { today } from '@/lib/date';

export async function loadConsistencyContext() {
  const { routines, items, pauseWindows } = await loadDosingContext();
  const allLogs = await db.select().from(doseLogs);
  const currentDate = today();

  const logsByDate = new Map<string, DoseLogRecord[]>();
  for (const log of allLogs) {
    const list = logsByDate.get(log.date) ?? [];
    list.push(log);
    logsByDate.set(log.date, list);
  }

  const scheduledFor = (date: string): ScheduledDose[] =>
    getScheduledDoses(date, routines, pauseWindows, items);

  const dayProgressFor = (date: string) =>
    resolveDayProgress(date, scheduledFor(date), logsByDate.get(date) ?? [], currentDate);

  const dayStatus: DayStatusResolver = (date) => dayProgressFor(date).status;

  const effectiveStateFor = (date: string, itemId: string, time: string) => {
    const log = (logsByDate.get(date) ?? []).find(
      (l) => l.routineItemId === itemId && l.time === time
    );
    return computeEffectiveState(log, date, currentDate);
  };

  const earliestStart = routines.reduce<string | null>(
    (min, r) => (min === null || r.startDate < min ? r.startDate : min),
    null
  );

  return {
    dayStatus,
    dayProgressFor,
    scheduledFor,
    effectiveStateFor,
    earliestStart,
    currentDate,
    items,
    routines,
  };
}

export interface WeeklyProgress {
  days: WeekDay[];
  currentStreak: number;
  /** Days fully done vs. days that had something scheduled, over the calendar week so far. */
  completed: number;
  total: number;
  /** First routine's start date — day 0 of treatment, which is what Home's milestones count from. */
  earliestStart: string | null;
}

/**
 * The compact week view on Home. Kept separate from `useConsistencyStats` so Home doesn't pay
 * for the month heatmap and per-item breakdown it doesn't show.
 */
export function useWeeklyProgress() {
  return useQuery({
    queryKey: ['streak', 'weekly'],
    queryFn: async (): Promise<WeeklyProgress> => {
      const { dayStatus, currentDate, earliestStart } = await loadConsistencyContext();
      // Ratio spans the calendar week so far — computeRangeRatio caps at currentDate, so
      // days later this week aren't counted against you.
      const weekStart = startOfWeek(currentDate);
      const { completed, total } = computeRangeRatio(weekStart, currentDate, currentDate, dayStatus);
      return {
        days: computeCalendarWeek(currentDate, dayStatus),
        currentStreak: computeCurrentStreak(currentDate, dayStatus, earliestStart),
        completed,
        total,
        earliestStart,
      };
    },
  });
}

export interface ItemConsistencyRow {
  itemId: string;
  name: string;
  type: RoutineItemType;
  taken: number;
  total: number;
}

export interface ConsistencyStats {
  monthRatio: { completed: number; total: number };
  /** Per-item, over the calendar week so far — "LLLT: 3 of 3 this week". */
  itemsThisWeek: ItemConsistencyRow[];
  monthDayStatuses: Record<string, DayStatus>;
  year: number;
  month: number; // 1-12
}

export function useConsistencyStats() {
  return useQuery({
    queryKey: ['consistency', 'stats'],
    queryFn: async (): Promise<ConsistencyStats> => {
      const ctx = await loadConsistencyContext();
      const [year, month] = ctx.currentDate.split('-').map(Number);

      const monthRatio = computeMonthRatio(year, month, ctx.currentDate, ctx.dayStatus);

      // Same calendar week as Home's strip — both surfaces say "this week", so they must mean
      // the same thing rather than one being a rolling 7 days.
      const weekStart = startOfWeek(ctx.currentDate);
      // Only the routine in effect today. `ctx.items` holds items from *every* routine ever
      // created, so without this every past routine's items linger here permanently stuck on
      // "nothing due", and a duplicate appears each time the routine is changed.
      const activeRoutine = findRoutineForDate(ctx.routines, ctx.currentDate);
      const activeItems = ctx.items.filter((i) => i.routineId === activeRoutine?.id);

      const itemsThisWeek = activeItems.map((item) => ({
        itemId: item.id,
        name: item.name,
        type: item.type,
        ...computeItemConsistency(
          weekStart,
          ctx.currentDate,
          item.id,
          ctx.currentDate,
          ctx.scheduledFor,
          ctx.effectiveStateFor
        ),
      }));

      const daysInMonth = new Date(year, month, 0).getDate();
      const monthDayStatuses: Record<string, DayStatus> = {};
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (date > ctx.currentDate) break;
        monthDayStatuses[date] = ctx.dayStatus(date);
      }

      return { monthRatio, itemsThisWeek, monthDayStatuses, year, month };
    },
  });
}
