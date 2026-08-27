import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TimeOfDayStat } from '@/features/consistency/trend';
import { formatTime } from '@/features/routine/describe';
import { useTheme } from '@/hooks/use-theme';

/**
 * Which time of day gets missed — the most actionable thing this data can say.
 *
 * Everything else on this screen tells you *how* you're doing; this one suggests what to change,
 * because the fix is concrete: move the reminder, or move the dose. Ordered worst-first so the
 * problem time is the first thing read.
 *
 * It renders for a single scheduled time too. Comparing times is the *best* thing it does, not
 * the only useful one — and a panel that silently disappears for anyone on a once-daily routine
 * makes the screen look broken rather than considered. What changes with one time is the
 * headline: a comparison needs something to compare.
 */
export function TimeOfDayChart({ stats }: { stats: TimeOfDayStat[] }) {
  const theme = useTheme();

  if (stats.length === 0) return null;

  const worst = stats[0];
  const best = stats[stats.length - 1];
  const worstRate = worst.total === 0 ? 1 : worst.taken / worst.total;
  const bestRate = best.total === 0 ? 1 : best.taken / best.total;
  // Only claim a pattern when there's a comparison to make and the gap is big enough to act on.
  const notable = stats.length >= 2 && bestRate - worstRate >= 0.2;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">By time of day</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        {notable
          ? `Your ${formatTime(worst.time)} dose is the one you miss most.`
          : stats.length === 1
            ? `Everything is scheduled for ${formatTime(worst.time)}.`
            : 'Fairly even across the day.'}
      </ThemedText>

      {stats.map((stat) => {
        const rate = stat.total === 0 ? 0 : stat.taken / stat.total;
        return (
          <View key={stat.time} style={styles.row}>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.time}>
              {formatTime(stat.time)}
            </ThemedText>
            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              {rate > 0 ? (
                <View
                  style={[styles.fill, { width: `${Math.round(rate * 100)}%`, backgroundColor: theme.taken }]}
                />
              ) : null}
            </View>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.count}>
              {stat.taken}/{stat.total}
            </ThemedText>
          </View>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  time: { width: 64 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  count: { width: 38, textAlign: 'right' },
});
