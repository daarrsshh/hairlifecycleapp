import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getDoseLogsForDate, getRequiredSlotsForDate } from '@/features/dose-log/api';
import { computeEffectiveState, type DoseSlot } from '@/features/dose-log/doseState';
import { useLogDose } from '@/features/dose-log/hooks';
import { getPeriodForDate } from '@/features/treatment/api';
import { useTheme } from '@/hooks/use-theme';
import { today, type DateString } from '@/lib/date';

const SLOT_LABEL: Record<DoseSlot, string> = { am: 'Morning', pm: 'Evening' };

/** The calendar's "corrections" affordance (PRD §4.2): tapping a day shows its slots, and a
 * Missed slot (unlocked, per PRD §5.2) can still be marked Taken retroactively. */
export function DayDetailCard({ date, onClose }: { date: DateString; onClose: () => void }) {
  const theme = useTheme();
  const logDose = useLogDose();

  const { data } = useQuery({
    queryKey: ['dayDetail', date],
    queryFn: async () => {
      const [period, requiredSlots, logs] = await Promise.all([
        getPeriodForDate(date),
        getRequiredSlotsForDate(date),
        getDoseLogsForDate(date),
      ]);
      return { period, requiredSlots, logs };
    },
  });

  if (!data || data.requiredSlots.length === 0) return null;
  const { period, requiredSlots, logs } = data;
  const currentDate = today();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedView style={styles.header}>
        <ThemedText type="smallBold">{date}</ThemedText>
        <Pressable onPress={onClose}>
          <ThemedText themeColor="textSecondary" type="small">
            Close
          </ThemedText>
        </Pressable>
      </ThemedView>

      {requiredSlots.map((slot) => {
        const log = logs.find((l) => l.slot === slot);
        const state = computeEffectiveState(log, date, currentDate);

        return (
          <View key={slot} style={styles.row}>
            <ThemedText themeColor="textSecondary" type="small">
              {SLOT_LABEL[slot]}
            </ThemedText>
            {state === 'taken' ? (
              <ThemedText style={{ color: theme.taken }}>✓ Taken</ThemedText>
            ) : state === 'missed' && period ? (
              <Pressable
                onPress={() =>
                  logDose.mutate({ treatmentPeriodId: period.id, date, slot, state: 'taken' })
                }>
                <ThemedText type="linkPrimary">Mark as taken</ThemedText>
              </Pressable>
            ) : (
              <ThemedText style={{ color: theme.missed }}>– Not taken</ThemedText>
            )}
          </View>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
