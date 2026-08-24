import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { DoseState } from '@/features/dose-log/doseState';
import { formatTime } from '@/features/routine/describe';
import { useTheme } from '@/hooks/use-theme';

/**
 * One dose inside an item's card: a status circle, the time it's due, and its action.
 *
 * The circle is the per-dose status at a glance — so a twice-daily item shows one filled and
 * one empty rather than looking like two unrelated entries. Taken/Skip stay as explicit
 * buttons rather than being folded into tapping the circle: the PRD keeps the logging
 * interaction unchanged, and a single tap toggling between three states would be ambiguous.
 */
export function DoseRow({
  time,
  state,
  onTaken,
  onSkip,
}: {
  time: string;
  state: DoseState;
  onTaken: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();

  const circleStyle =
    state === 'taken'
      ? { backgroundColor: theme.taken, borderColor: theme.taken }
      : state === 'pending'
        ? { backgroundColor: 'transparent', borderColor: theme.primary }
        : { backgroundColor: 'transparent', borderColor: theme.missed };

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={[styles.circle, circleStyle]}>
        {state === 'taken' ? <ThemedText style={styles.check}>✓</ThemedText> : null}
      </View>

      <ThemedText type="small" themeColor={state === 'pending' ? 'text' : 'textSecondary'} style={styles.time}>
        {formatTime(time)}
      </ThemedText>

      {state === 'taken' ? (
        <ThemedText type="small" style={{ color: theme.taken }}>
          Taken
        </ThemedText>
      ) : state === 'skipped' ? (
        // Skipped is locked; Missed stays open to a late Taken (PRD §5.2).
        <ThemedText type="small" style={{ color: theme.missed }}>
          Not taken
        </ThemedText>
      ) : state === 'missed' ? (
        <Pressable onPress={onTaken} hitSlop={8}>
          <ThemedText type="small" style={{ color: theme.missed }}>
            Not taken · log it
          </ThemedText>
        </Pressable>
      ) : (
        <ThemedView type="backgroundElement" style={styles.actions}>
          <Pressable onPress={onTaken} style={[styles.takeButton, { backgroundColor: theme.primary }]}>
            <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
              Taken
            </ThemedText>
          </Pressable>
          <Pressable onPress={onSkip} hitSlop={8}>
            <ThemedText themeColor="textSecondary" type="small">
              Skip
            </ThemedText>
          </Pressable>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 40 },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: '#fff', fontSize: 13, lineHeight: 16 },
  time: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  takeButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
