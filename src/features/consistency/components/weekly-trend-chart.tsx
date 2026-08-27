import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TrendWeek } from '@/features/consistency/trend';
import { useTheme } from '@/hooks/use-theme';

const CHART_HEIGHT = 84;

/**
 * Adherence week by week — the direction, not the number.
 *
 * Drawn with plain Views rather than a charting library: eight bars don't justify a dependency,
 * and hand-drawing keeps it on the app's own tokens in both themes.
 *
 * A week with nothing scheduled renders as a hollow track, not a zero-height bar. Weeks you were
 * paused are gaps in the data; drawing them at the floor would read as eight failures in a row.
 */
export function WeeklyTrendChart({ weeks }: { weeks: TrendWeek[] }) {
  const theme = useTheme();

  if (weeks.length === 0) return null;

  const scored = weeks.filter((w) => w.ratio !== null);
  const average =
    scored.length === 0 ? null : scored.reduce((n, w) => n + (w.ratio ?? 0), 0) / scored.length;

  // Compare the most recent half against the earlier half — enough to say "better" or "worse"
  // without pretending to statistical significance on eight data points.
  const half = Math.floor(scored.length / 2);
  const older = scored.slice(0, half);
  const recent = scored.slice(half);
  const trendLabel = describeTrend(older, recent);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Week by week</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        {average === null
          ? 'Nothing scheduled yet.'
          : `Averaging ${Math.round(average * 100)}% of scheduled days${trendLabel}`}
      </ThemedText>

      <View style={styles.chart}>
        {weeks.map((week) => {
          const ratio = week.ratio;
          const height = ratio === null ? 0 : Math.max(Math.round(ratio * CHART_HEIGHT), 3);
          return (
            <View key={week.weekStart} style={styles.column}>
              <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                {ratio !== null ? (
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        // The in-flight week is scored on a partial week, so it's marked as
                        // provisional rather than compared like a finished one.
                        backgroundColor: week.isCurrent ? theme.primary : theme.taken,
                      },
                    ]}
                  />
                ) : null}
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {week.isCurrent ? 'now' : shortLabel(week.weekStart)}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

function describeTrend(older: TrendWeek[], recent: TrendWeek[]): string {
  if (older.length === 0 || recent.length === 0) return '';
  const avg = (ws: TrendWeek[]) => ws.reduce((n, w) => n + (w.ratio ?? 0), 0) / ws.length;
  const delta = avg(recent) - avg(older);
  // Under five points either way isn't a trend, it's noise — say nothing rather than
  // manufacture a story out of one missed dose.
  if (Math.abs(delta) < 0.05) return ', holding steady';
  return delta > 0 ? ', up on recent weeks' : ', down on recent weeks';
}

/** "2 Jun" — short enough to sit under a narrow bar. */
function shortLabel(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${MONTHS[month - 1]}`;
}

const styles = StyleSheet.create({
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.one, marginTop: Spacing.two },
  column: { flex: 1, alignItems: 'center', gap: Spacing.one },
  track: {
    width: '100%',
    height: CHART_HEIGHT,
    borderRadius: Spacing.one,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: Spacing.one },
});
