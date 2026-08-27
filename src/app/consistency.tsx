import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ConsistencyHeatmap } from '@/features/consistency/components/consistency-heatmap';
import { DayDetailCard } from '@/features/consistency/components/day-detail-card';
import { ItemConsistencyList } from '@/features/consistency/components/item-consistency-list';
import { TimeOfDayChart } from '@/features/consistency/components/time-of-day-chart';
import { WeeklyTrendChart } from '@/features/consistency/components/weekly-trend-chart';
import { useConsistencyStats } from '@/features/consistency/hooks';

/**
 * Charts, not scores.
 *
 * Both streak numbers were removed. A streak is binary, erased by one ordinary bad day, and
 * says nothing about direction — and "best streak ever" was actively discouraging at the moment
 * someone opens this screen, since a current 2 against a personal best of 40 reads as a
 * reminder of failure. Neither survived; don't reintroduce them.
 *
 * Each panel now answers a different question, in the order they're worth asking: am I getting
 * better or worse, what should I change, which item am I slipping on, and where were the gaps.
 * The last is also the corrections affordance — the only interactive thing here.
 */
export default function ConsistencyScreen() {
  const { data, isLoading } = useConsistencyStats();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (isLoading || !data) {
    return <ThemedView style={styles.container} />;
  }

  const { monthRatio } = data;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Consistency' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <WeeklyTrendChart weeks={data.trend} />
        <TimeOfDayChart stats={data.timeOfDay} />

        {data.itemsThisWeek.length > 0 ? <ItemConsistencyList items={data.itemsThisWeek} /> : null}

        <ThemedView type="backgroundElement" style={styles.card}>
          {/* The heatmap renders its own "August 2026" heading. */}
          <ConsistencyHeatmap
            year={data.year}
            month={data.month}
            dayStatuses={data.monthDayStatuses}
            onSelectDate={setSelectedDate}
          />
          <ThemedText themeColor="textSecondary" type="small" style={styles.monthSummary}>
            {monthRatio.total === 0
              ? 'Nothing scheduled this month yet.'
              : `${monthRatio.completed} of ${monthRatio.total} days complete`}
          </ThemedText>
          {/* Tapping a day to fix a missed dose is PRD §4.2 and was entirely unsignposted —
              a correction feature nobody can find is the same as not having one. */}
          <ThemedText themeColor="textSecondary" type="caption">
            Tap any day to see what was scheduled, or to log something you missed.
          </ThemedText>
        </ThemedView>

        {selectedDate ? (
          <DayDetailCard date={selectedDate} onClose={() => setSelectedDate(null)} />
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.five },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  monthSummary: { marginTop: Spacing.two },
});
