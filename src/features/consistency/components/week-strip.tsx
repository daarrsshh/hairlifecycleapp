import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { DayStatus } from '@/features/dose-log/doseState';
import { dayOfWeek } from '@/features/dose-log/doseState';
import type { RecentDay } from '@/features/consistency/streak';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Seven days at a glance. Deliberately non-punishing (PRD §9): a missed day is simply an
 * unfilled dot in the muted "not taken" grey — never red, never an X, and days with nothing
 * scheduled read as neutral rather than as failures.
 */
export function WeekStrip({ days }: { days: RecentDay[] }) {
  const theme = useTheme();

  const fillFor = (status: DayStatus) => {
    if (status === 'complete') return theme.taken;
    if (status === 'in-progress') return theme.primary;
    if (status === 'incomplete') return theme.missed;
    return 'transparent'; // no-treatment — nothing was due, so nothing to score
  };

  return (
    <ThemedView style={styles.row}>
      {days.map((day) => (
        <View key={day.date} style={styles.cell}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            {WEEKDAY_INITIALS[dayOfWeek(day.date)]}
          </ThemedText>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: fillFor(day.status),
                borderColor: day.isToday ? theme.primary : theme.border,
                borderWidth: day.isToday ? 2 : 1,
              },
            ]}
          />
        </View>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center', gap: Spacing.one, flex: 1 },
  label: { fontSize: 11 },
  dot: { width: 22, height: 22, borderRadius: 11 },
});
