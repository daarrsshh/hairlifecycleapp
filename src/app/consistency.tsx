import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ConsistencyHeatmap } from '@/features/consistency/components/consistency-heatmap';
import { DayDetailCard } from '@/features/consistency/components/day-detail-card';
import { ItemConsistencyList } from '@/features/consistency/components/item-consistency-list';
import { useConsistencyStats } from '@/features/consistency/hooks';

/**
 * Two things, and one of them isn't a statistic.
 *
 * This screen has been cut down repeatedly, and the pattern in what survived is worth keeping:
 * every *score* was removed — current streak, best streak, weekly trend chart, time-of-day
 * breakdown — and what stayed is the per-item breakdown (which names the specific thing you're
 * slipping on) and the heatmap (which is really the corrections tool). Numbers that only tell
 * you how you're doing turned out not to earn their space; the things that tell you what to
 * *do* did. Weigh anything added here against that.
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
