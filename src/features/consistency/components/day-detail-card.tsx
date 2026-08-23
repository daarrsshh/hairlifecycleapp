import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getDoseLogsForDate, getScheduledDosesForDate } from '@/features/dose-log/api';
import { computeEffectiveState } from '@/features/dose-log/doseState';
import { useLogDose } from '@/features/dose-log/hooks';
import { getAllRoutineItems } from '@/features/routine/api';
import { formatTime } from '@/features/routine/describe';
import { useTheme } from '@/hooks/use-theme';
import { today, type DateString } from '@/lib/date';

/**
 * The calendar's "corrections" affordance (PRD §4.2): tapping a day lists every dose that was
 * scheduled, and a Missed one (still unlocked, per PRD §5.2) can be marked Taken retroactively.
 * Each row is a specific item at a specific time, so a twice-daily item shows twice.
 */
export function DayDetailCard({ date, onClose }: { date: DateString; onClose: () => void }) {
  const theme = useTheme();
  const logDose = useLogDose();

  const { data } = useQuery({
    queryKey: ['dayDetail', date],
    queryFn: async () => {
      const [scheduled, logs, items] = await Promise.all([
        getScheduledDosesForDate(date),
        getDoseLogsForDate(date),
        getAllRoutineItems(),
      ]);
      return { scheduled, logs, itemsById: new Map(items.map((i) => [i.id, i])) };
    },
  });

  if (!data || data.scheduled.length === 0) return null;
  const { scheduled, logs, itemsById } = data;
  const currentDate = today();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedView type="backgroundElement" style={styles.header}>
        <ThemedText type="smallBold">{date}</ThemedText>
        <Pressable onPress={onClose}>
          <ThemedText themeColor="textSecondary" type="small">
            Close
          </ThemedText>
        </Pressable>
      </ThemedView>

      {scheduled.map((dose) => {
        const item = itemsById.get(dose.itemId);
        if (!item) return null;

        const log = logs.find((l) => l.routineItemId === dose.itemId && l.time === dose.time);
        const state = computeEffectiveState(log, date, currentDate);

        return (
          <View key={`${dose.itemId}-${dose.time}`} style={styles.row}>
            <ThemedView type="backgroundElement" style={styles.rowText}>
              <ThemedText type="small">{item.name}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {formatTime(dose.time)}
              </ThemedText>
            </ThemedView>

            {state === 'taken' ? (
              <ThemedText style={{ color: theme.taken }}>✓ Taken</ThemedText>
            ) : state === 'missed' ? (
              <Pressable
                onPress={() =>
                  logDose.mutate({
                    routineItemId: dose.itemId,
                    date,
                    time: dose.time,
                    state: 'taken',
                  })
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
  rowText: { gap: 1 },
});
