import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DayStatus } from '@/features/dose-log/doseState';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  const cellColor = (status: DayStatus | undefined) => {
    if (status === 'complete') return theme.taken;
    if (status === 'incomplete') return theme.missed;
    if (status === 'in-progress') return theme.primary;
    return theme.backgroundElement;
  };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(<View key={`empty-${i}`} style={styles.cell} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = dayStatuses[date];
    const disabled = status === undefined || status === 'no-treatment';
    cells.push(
      <Pressable
        key={date}
        disabled={disabled}
        onPress={() => onSelectDate?.(date)}
        style={[styles.cell, styles.dayCell, { backgroundColor: cellColor(dayStatuses[date]) }]}>
        <ThemedText type="small" style={styles.dayLabel}>
          {day}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.dayLabel}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>
      <View style={styles.grid}>{cells}</View>
    </View>
  );
}

const CELL_SIZE = 36;

const styles = StyleSheet.create({
  weekdayRow: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    maxHeight: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: { borderRadius: Spacing.one, padding: 2 },
  dayLabel: { fontSize: 11 },
});
