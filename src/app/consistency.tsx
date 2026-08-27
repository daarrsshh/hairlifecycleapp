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
 * Deliberately three things, not five.
 *
 * "Best streak ever" was removed rather than restyled: it isn't actionable, and it's at its most
 * discouraging exactly when someone opens this screen — a current streak of 2 against a personal
 * best of 40 is a reminder of a failure, which is the dynamic the whole product avoids.
 *
 * What's left each answers a different question: how am I doing right now, which *specific* item
 * am I slipping on, and where were the gaps. The last of those is also the corrections
 * affordance, which is the only genuinely interactive thing here.
 */
export default function ConsistencyScreen() {
  const { data, isLoading } = useConsistencyStats();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (isLoading || !data) {
    return <ThemedView style={styles.container} />;
  }

  const { currentStreak, monthRatio } = data;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Consistency' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="title" style={styles.streakNumber}>
            {currentStreak}
          </ThemedText>
          {/* "days in a row" alone doesn't say in a row of *what*, and the two surprising rules
              — a day counts only when everything scheduled is done, and rest or paused days are
              skipped rather than held against you — were nowhere on the screen. Wording matches
              Home's badge so the same number isn't described two different ways. */}
          <ThemedText type="heading">day streak</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {currentStreak === 0
              ? 'A day counts once everything scheduled is done. Today still counts — log a dose to start.'
              : 'Days where you took everything scheduled. Rest days and pauses are skipped, not counted against you.'}
          </ThemedText>
        </ThemedView>

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
  streakNumber: { lineHeight: 46 },
  monthSummary: { marginTop: Spacing.two },
});
