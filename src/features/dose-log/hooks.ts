import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDoseLogsForDate, getScheduledDosesForDate, logDose } from '@/features/dose-log/api';
import {
  computeEffectiveState,
  type DoseLogRecord,
  type DoseState,
  type RoutineItemType,
} from '@/features/dose-log/doseState';
import { getActiveRoutine, getAllRoutineItems } from '@/features/routine/api';
import { timeOfDayLabel } from '@/features/routine/describe';
import { today } from '@/lib/date';

export interface TodayDose {
  itemId: string;
  time: string;
  name: string;
  dosage: string | null;
  type: RoutineItemType;
  state: DoseState;
  /** This dose's position among today's doses for the same item, 0-based. */
  doseIndex: number;
  /** How many times this item is due today — >1 means it appears in several time blocks. */
  doseCount: number;
  /** Every one of today's doses for this item, in time order, so a card can show overall progress. */
  itemDoseStates: DoseState[];
}

/** Doses due at the same time, shown as one block ("Morning · 8:00 AM"). */
export interface TodayTimeBlock {
  time: string;
  label: string;
  doses: TodayDose[];
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

      // `scheduled` is time-ordered, so an item's doses are collected in the order they're due —
      // which is what makes "dose 2 of 2" meaningful.
      const timesByItem = new Map<string, string[]>();
      for (const dose of scheduled) {
        timesByItem.set(dose.itemId, [...(timesByItem.get(dose.itemId) ?? []), dose.time]);
      }

      const blocks = new Map<string, TodayTimeBlock>();
      for (const dose of scheduled) {
        const item = byId.get(dose.itemId);
        if (!item) continue;

        const itemTimes = timesByItem.get(dose.itemId) ?? [dose.time];
        const block = blocks.get(dose.time) ?? {
          time: dose.time,
          label: timeOfDayLabel(dose.time),
          doses: [],
        };
        block.doses.push({
          itemId: dose.itemId,
          time: dose.time,
          name: item.name,
          dosage: item.dosage,
          type: item.type,
          state: stateFor(dose.itemId, dose.time),
          doseIndex: itemTimes.indexOf(dose.time),
          doseCount: itemTimes.length,
          itemDoseStates: itemTimes.map((t) => stateFor(dose.itemId, t)),
        });
        blocks.set(dose.time, block);
      }

      const timeBlocks = [...blocks.values()].sort((a, b) => a.time.localeCompare(b.time));
      const allDoses = timeBlocks.flatMap((b) => b.doses);

      return {
        date,
        routine,
        timeBlocks,
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
