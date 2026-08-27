import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DayStatus } from '@/features/dose-log/doseState';
import { buildMonthGrid, describeMonth, weekdayInitials } from '@/features/consistency/month-grid';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAY_INITIALS = weekdayInitials(); // Monday-first, matching Home's week strip

/**
 * A month of day-statuses. Laid out as explicit rows of 7 `flex: 1` cells rather than a
 * wrapping row of percentage widths — the latter could round a column onto the next line,
 * emptying a column and shifting every date after it.
 */
export function ConsistencyHeatmap({
  year,
  month,
  dayStatuses,
  onSelectDate,
}: {
  year: number;
  month: number; // 1-12
  dayStatuses: Record<string, DayStatus>;
  onSelectDate?: (date: string) => void;
}) {
  const theme = useTheme();
  const weeks = buildMonthGrid(year, month);

  const cellColor = (status: DayStatus | undefined) => {
    if (status === 'complete') return theme.taken;
    if (status === 'incomplete') return theme.missed;
    if (status === 'in-progress') return theme.primary;
    return theme.backgroundSelected; // nothing due, or not yet reached
  };

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{describeMonth(year, month)}</ThemedText>

      <View style={styles.row}>
        {WEEKDAY_INITIALS.map((label, i) => (
          <View key={i} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.dayLabel}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.row}>
          {week.map((date, dayIndex) => {
            if (!date) return <View key={`blank-${dayIndex}`} style={styles.cell} />;

            const status = dayStatuses[date];
            const dayNumber = Number(date.slice(-2));
            const disabled = status === undefined || status === 'no-treatment';
            return (
              <View key={date} style={styles.cell}>
                {/* Unlabelled, this whole grid reads as thirty-one bare numbers — no status, no
                    month, and no hint that a day can be tapped to fix a missed dose. The
                    corrections feature was not just undiscoverable but unusable. */}
                <Pressable
                  disabled={disabled}
                  onPress={() => onSelectDate?.(date)}
                  accessibilityRole="button"
                  accessibilityState={{ disabled }}
                  accessibilityLabel={describeDay(dayNumber, month, year, status)}
                  accessibilityHint={disabled ? undefined : 'Opens what was scheduled that day'}
                  style={[styles.dayCell, { backgroundColor: cellColor(status) }]}>
                  <ThemedText
                    type="small"
                    style={styles.dayLabel}
                    accessibilityElementsHidden
                    importantForAccessibility="no">
                    {dayNumber}
                  </ThemedText>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const STATUS_DESCRIPTION: Record<string, string> = {
  complete: 'everything taken',
  incomplete: 'something missed',
  'in-progress': 'still in progress',
  'no-treatment': 'nothing scheduled',
};

/** "12 August, everything taken" — the colour of the cell, said aloud. */
function describeDay(day: number, month: number, year: number, status: string | undefined): string {
  const monthName = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long' });
  const described = status ? STATUS_DESCRIPTION[status] : undefined;
  return described ? `${day} ${monthName}, ${described}` : `${day} ${monthName}`;
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  row: { flexDirection: 'row' },
  // flex:1 across exactly 7 siblings — no percentage rounding, so columns always line up.
  cell: { flex: 1, aspectRatio: 1, maxHeight: 40, padding: 2 },
  dayCell: {
    flex: 1,
    borderRadius: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 11 },
});
