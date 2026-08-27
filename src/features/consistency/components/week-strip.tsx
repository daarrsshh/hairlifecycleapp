import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { WeekDay } from '@/features/consistency/streak';
import type { DayStatus } from '@/features/dose-log/doseState';
import { dayOfWeek } from '@/features/dose-log/doseState';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The calendar week at a glance, Monday first. Deliberately non-punishing (PRD §9): a missed
 * day is simply an unfilled dot in the muted "not taken" grey — never red, never an X — and
 * days with nothing scheduled read as neutral rather than as failures. Days still to come are
 * dimmed so the week reads as in progress rather than already half-failed.
 */
export function WeekStrip({ days }: { days: WeekDay[] }) {
  const theme = useTheme();

  const fillFor = (status: DayStatus) => {
    if (status === 'complete') return theme.taken;
    if (status === 'in-progress') return theme.primary;
    if (status === 'incomplete') return theme.missed;
    return 'transparent'; // no-treatment — nothing was due, so nothing to score
  };

  return (
    <ThemedView style={styles.row}>
      {/* Grouped per day so a screen reader hears "Monday, everything taken" rather than seven
          disembodied letters followed by seven unannounced dots. */}
      {days.map((day) => (
        <View
          key={day.date}
          style={[styles.cell, day.isFuture && styles.futureCell]}
          accessible
          accessibilityLabel={describeDay(day)}>
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

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const STATUS_DESCRIPTION: Record<DayStatus, string> = {
  complete: 'everything taken',
  incomplete: 'something missed',
  'in-progress': 'still in progress',
  'no-treatment': 'nothing scheduled',
};

function describeDay(day: WeekDay): string {
  const name = WEEKDAY_NAMES[dayOfWeek(day.date)];
  if (day.isFuture) return `${name}, still to come`;
  const today = day.isToday ? 'Today, ' : '';
  return `${today}${name}, ${STATUS_DESCRIPTION[day.status]}`;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center', gap: Spacing.one, flex: 1 },
  futureCell: { opacity: 0.4 },
  label: { fontSize: 11 },
  dot: { width: 22, height: 22, borderRadius: 11 },
});
