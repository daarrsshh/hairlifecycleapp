import { useQuery } from '@tanstack/react-query';

import { db } from '@/db/client';
import { doseLogs } from '@/db/schema';
import { loadDosingContext } from '@/features/dose-log/api';
import {
  computeEffectiveState,
  getScheduledDoses,
  resolveDayProgress,
  type DayStatus,
  type DoseLogRecord,
  type ScheduledDose,
} from '@/features/dose-log/doseState';
import {
  computeBestStreak,
  computeCurrentStreak,
  computeItemConsistency,
  computeMonthRatio,
  type DayStatusResolver,
} from '@/features/consistency/streak';
import { addDays, today } from '@/lib/date';

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
  };
}

export function useCurrentStreak() {
  return useQuery({
    queryKey: ['streak', 'current'],
    queryFn: async () => {
      const { dayStatus, currentDate, earliestStart } = await loadConsistencyContext();
      return computeCurrentStreak(currentDate, dayStatus, earliestStart);
    },
  });
}

export interface ItemConsistencyRow {
  itemId: string;
  name: string;
  taken: number;
  total: number;
}

export interface ConsistencyStats {
  currentStreak: number;
  bestStreak: number;
  monthRatio: { completed: number; total: number };
  /** Per-item, over the last 7 days — "LLLT: 3 of 3 this week". */
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

      const currentStreak = computeCurrentStreak(ctx.currentDate, ctx.dayStatus, ctx.earliestStart);
      const bestStreak = ctx.earliestStart
        ? computeBestStreak(ctx.earliestStart, ctx.currentDate, ctx.dayStatus)
        : 0;
      const monthRatio = computeMonthRatio(year, month, ctx.currentDate, ctx.dayStatus);

      const weekStart = addDays(ctx.currentDate, -6);
      const itemsThisWeek = ctx.items.map((item) => ({
        itemId: item.id,
        name: item.name,
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

      return { currentStreak, bestStreak, monthRatio, itemsThisWeek, monthDayStatuses, year, month };
    },
  });
}
