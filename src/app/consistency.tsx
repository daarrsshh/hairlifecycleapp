import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ConsistencyHeatmap } from '@/features/consistency/components/consistency-heatmap';
import { useConsistencyStats } from '@/features/consistency/hooks';

function slotPercent(taken: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((taken / total) * 100)}%`;
}

export default function ConsistencyScreen() {
  const { data, isLoading } = useConsistencyStats();

  if (isLoading || !data) {
    return <ThemedView style={styles.container} />;
  }

  return (
    <ThemedView style={styles.container}>
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

        <View style={styles.statsRow}>
          <StatTile label="Morning" value={slotPercent(data.am.taken, data.am.total)} />
          <StatTile label="Evening" value={slotPercent(data.pm.taken, data.pm.total)} />
        </View>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText themeColor="textSecondary" type="small" style={styles.heatmapLabel}>
            This month at a glance
          </ThemedText>
          <ConsistencyHeatmap year={data.year} month={data.month} dayStatuses={data.monthDayStatuses} />
        </ThemedView>
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
});
