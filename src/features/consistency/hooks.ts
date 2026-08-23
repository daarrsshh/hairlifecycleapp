import { useQuery } from '@tanstack/react-query';

import { db } from '@/db/client';
import { doseLogs } from '@/db/schema';
import { loadDosingContext } from '@/features/dose-log/api';
import {
  computeEffectiveState,
  getRequiredSlots,
  resolveDayStatus,
  type DayStatus,
  type DoseLogRecord,
  type DoseSlot,
} from '@/features/dose-log/doseState';
import {
  computeBestStreak,
  computeCurrentStreak,
  computeMonthRatio,
  computeSlotBreakdown,
  type DayStatusResolver,
} from '@/features/consistency/streak';
import { today } from '@/lib/date';

export async function loadConsistencyContext() {
  const { periods, drugs, pauseWindows } = await loadDosingContext();
  const allLogs = await db.select().from(doseLogs);
  const currentDate = today();

  const logsByDate = new Map<string, DoseLogRecord[]>();
  for (const log of allLogs) {
    const list = logsByDate.get(log.date) ?? [];
    list.push(log);
    logsByDate.set(log.date, list);
  }

  const requiredSlotsFor = (date: string) => getRequiredSlots(date, periods, pauseWindows, drugs);
  const dayStatus: DayStatusResolver = (date) =>
    resolveDayStatus(date, requiredSlotsFor(date), logsByDate.get(date) ?? [], currentDate);
  const effectiveStateFor = (date: string, slot: DoseSlot) => {
    const log = (logsByDate.get(date) ?? []).find((l) => l.slot === slot);
    return computeEffectiveState(log, date, currentDate);
  };

  const earliestStart = periods.reduce<string | null>(
    (min, p) => (min === null || p.startDate < min ? p.startDate : min),
    null
  );

  return { dayStatus, requiredSlotsFor, effectiveStateFor, earliestStart, currentDate };
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

export interface ConsistencyStats {
  currentStreak: number;
  bestStreak: number;
  monthRatio: { completed: number; total: number };
  am: { taken: number; total: number };
  pm: { taken: number; total: number };
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
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

      const currentStreak = computeCurrentStreak(ctx.currentDate, ctx.dayStatus, ctx.earliestStart);
      const bestStreak = ctx.earliestStart
        ? computeBestStreak(ctx.earliestStart, ctx.currentDate, ctx.dayStatus)
        : 0;
      const monthRatio = computeMonthRatio(year, month, ctx.currentDate, ctx.dayStatus);
      const am = computeSlotBreakdown(
        monthStart,
        ctx.currentDate,
        'am',
        ctx.currentDate,
        ctx.requiredSlotsFor,
        ctx.effectiveStateFor
      );
      const pm = computeSlotBreakdown(
        monthStart,
        ctx.currentDate,
        'pm',
        ctx.currentDate,
        ctx.requiredSlotsFor,
        ctx.effectiveStateFor
      );

      const daysInMonth = new Date(year, month, 0).getDate();
      const monthDayStatuses: Record<string, DayStatus> = {};
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (date > ctx.currentDate) break;
        monthDayStatuses[date] = ctx.dayStatus(date);
      }

      return { currentStreak, bestStreak, monthRatio, am, pm, monthDayStatuses, year, month };
    },
  });
}
