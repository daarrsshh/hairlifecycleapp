import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDoseLogsForDate, getRequiredSlotsForDate, logDose } from '@/features/dose-log/api';
import type { DoseSlot, DoseState } from '@/features/dose-log/doseState';
import { getActiveTreatmentPeriod, getDrugsForPeriod } from '@/features/treatment/api';
import { today } from '@/lib/date';

export function useTodayDoses() {
  const date = today();
  return useQuery({
    queryKey: ['doses', date],
    queryFn: async () => {
      const period = await getActiveTreatmentPeriod();
      const [requiredSlots, logs, drugs] = await Promise.all([
        getRequiredSlotsForDate(date),
        getDoseLogsForDate(date),
        period ? getDrugsForPeriod(period.id) : Promise.resolve([]),
      ]);
      return { date, period, requiredSlots, logs, drugs };
    },
  });
}

export function useLogDose() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      treatmentPeriodId: string;
      date: string;
      slot: DoseSlot;
      state: Extract<DoseState, 'taken' | 'skipped'>;
    }) => logDose(input.treatmentPeriodId, input.date, input.slot, input.state),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doses'] });
      queryClient.invalidateQueries({ queryKey: ['streak'] });
      queryClient.invalidateQueries({ queryKey: ['consistency'] });
    },
  });
}
