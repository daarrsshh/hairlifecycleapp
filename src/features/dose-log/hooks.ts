import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDoseLogsForDate, getScheduledDosesForDate, logDose } from '@/features/dose-log/api';
import {
  computeEffectiveState,
  type DoseLogRecord,
  type DoseState,
  type RoutineItemType,
} from '@/features/dose-log/doseState';
import { getActiveRoutine, getAllRoutineItems } from '@/features/routine/api';
import { today } from '@/lib/date';

/** One occurrence of an item on a given day — the unit that actually gets logged. */
export interface TodayDose {
  time: string;
  state: DoseState;
}

/**
 * A routine item plus every time it's due today. Home shows one card per item with a row per
 * dose, so a twice-daily item reads as one thing done twice rather than as two unrelated
 * entries — while each dose is still logged independently.
 */
export interface TodayItem {
  itemId: string;
  name: string;
  dosage: string | null;
  type: RoutineItemType;
  doses: TodayDose[]; // time order
  takenCount: number;
}

export function useTodayDoses() {
  const date = today();
  return useQuery({
    queryKey: ['doses', date],
    queryFn: async () => {
      const [routine, scheduled, logs, items] = await Promise.all([
        getActiveRoutine(),
        getScheduledDosesForDate(date),
        getDoseLogsForDate(date),
        getAllRoutineItems(),
      ]);

      const byId = new Map(items.map((i) => [i.id, i]));
      const stateFor = (itemId: string, time: string) =>
        computeEffectiveState(
          logs.find((l: DoseLogRecord) => l.routineItemId === itemId && l.time === time),
          date,
          date
        );

      // `scheduled` is time-ordered, so each item's doses accumulate in the order they're due.
      const byItem = new Map<string, TodayItem>();
      for (const dose of scheduled) {
        const item = byId.get(dose.itemId);
        if (!item) continue;

        const entry =
          byItem.get(dose.itemId) ??
          ({
            itemId: dose.itemId,
            name: item.name,
            dosage: item.dosage,
            type: item.type,
            doses: [],
            takenCount: 0,
          } satisfies TodayItem);

        const state = stateFor(dose.itemId, dose.time);
        entry.doses.push({ time: dose.time, state });
        if (state === 'taken') entry.takenCount++;
        byItem.set(dose.itemId, entry);
      }

      // Earliest-due item first, so what's most imminent is at the top.
      const todayItems = [...byItem.values()].sort((a, b) =>
        a.doses[0].time.localeCompare(b.doses[0].time)
      );
      const allDoses = todayItems.flatMap((i) => i.doses);

      return {
        date,
        routine,
        todayItems,
        takenCount: allDoses.filter((d) => d.state === 'taken').length,
        totalCount: allDoses.length,
      };
    },
  });
}

export function useLogDose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      routineItemId: string;
      date: string;
      time: string;
      state: Extract<DoseState, 'taken' | 'skipped'>;
    }) => logDose(input.routineItemId, input.date, input.time, input.state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doses'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
      queryClient.invalidateQueries({ queryKey: ['consistency'] });
      queryClient.invalidateQueries({ queryKey: ['dayDetail'] });
    },
  });
}
