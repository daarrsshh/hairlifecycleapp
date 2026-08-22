import { useQuery } from '@tanstack/react-query';

import { db } from '@/db/client';
import { doseLogs } from '@/db/schema';
import { getRequiredSlots, resolveDayStatus, type DoseLogRecord } from '@/features/dose-log/doseState';
import { loadDosingContext } from '@/features/dose-log/api';
import { computeCurrentStreak, type DayStatusResolver } from '@/features/consistency/streak';
import { today } from '@/lib/date';

async function buildDayStatusResolver(): Promise<DayStatusResolver> {
  const { periods, drugs, pauseWindows } = await loadDosingContext();
  const allLogs = await db.select().from(doseLogs);
  const currentDate = today();

  const logsByDate = new Map<string, DoseLogRecord[]>();
  for (const log of allLogs) {
    const list = logsByDate.get(log.date) ?? [];
    list.push(log);
    logsByDate.set(log.date, list);
  }

  return (date) => {
    const required = getRequiredSlots(date, periods, pauseWindows, drugs);
    return resolveDayStatus(date, required, logsByDate.get(date) ?? [], currentDate);
  };
}

export function useCurrentStreak() {
  return useQuery({
    queryKey: ['streak', 'current'],
    queryFn: async () => {
      const dayStatus = await buildDayStatusResolver();
      return computeCurrentStreak(today(), dayStatus);
    },
  });
}
