import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ConsistencyHeatmap } from '@/features/consistency/components/consistency-heatmap';
import { DayDetailCard } from '@/features/consistency/components/day-detail-card';
import { useConsistencyStats } from '@/features/consistency/hooks';

function itemRatio(taken: number, total: number): string {
  if (total === 0) return 'Nothing due yet';
  return `${taken} of ${total}`;
}

export default function ConsistencyScreen() {
  const { data, isLoading } = useConsistencyStats();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (isLoading || !data) {
    return <ThemedView style={styles.container} />;
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Consistency' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatTile label="Current streak" value={`${data.currentStreak}`} />
          <StatTile label="Best streak ever" value={`${data.bestStreak}`} />
        </View>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText themeColor="textSecondary" type="small">
            This month
          </ThemedText>
          <ThemedText type="subtitle">
            {data.monthRatio.completed} of {data.monthRatio.total} days
          </ThemedText>
        </ThemedView>

        {data.itemsThisWeek.length > 0 ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText themeColor="textSecondary" type="small">
              This week, item by item
            </ThemedText>
            {data.itemsThisWeek.map((item) => (
              <View key={item.itemId} style={styles.itemRow}>
                <ThemedText type="small">{item.name}</ThemedText>
                <ThemedText type="smallBold">{itemRatio(item.taken, item.total)}</ThemedText>
              </View>
            ))}
          </ThemedView>
        ) : null}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText themeColor="textSecondary" type="small" style={styles.heatmapLabel}>
            This month at a glance
          </ThemedText>
          <ConsistencyHeatmap
            year={data.year}
            month={data.month}
            dayStatuses={data.monthDayStatuses}
            onSelectDate={setSelectedDate}
          />
        </ThemedView>

        {selectedDate ? (
          <DayDetailCard date={selectedDate} onClose={() => setSelectedDate(null)} />
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.statTile}>
      <ThemedText themeColor="textSecondary" type="small">
        {label}
      </ThemedText>
      <ThemedText type="subtitle">{value}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  statsRow: { flexDirection: 'row', gap: Spacing.three },
  statTile: { flex: 1, padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  heatmapLabel: { marginBottom: Spacing.one },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
