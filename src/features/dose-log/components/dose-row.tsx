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
const STATE_DESCRIPTION: Record<DoseState, string> = {
  taken: 'taken',
  skipped: 'not taken',
  missed: 'not taken',
  pending: 'not logged yet',
};

export function DoseRow({
  time,
  state,
  itemName,
  onTaken,
  onSkip,
}: {
  time: string;
  state: DoseState;
  /** Only ever read aloud — the visible name lives on the card header above this row. */
  itemName: string;
  onTaken: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();

  /*
   * Screen readers linearise the card, so the item name above is long gone by the time these
   * controls are reached: three "Taken" buttons in a row with nothing saying which is which.
   * Every label here restates the item and time for that reason.
   */
  const doseName = `${itemName}, ${formatTime(time)}`;

  const circleStyle =
    state === 'taken'
      ? { backgroundColor: theme.taken, borderColor: theme.taken }
      : state === 'pending'
        ? { backgroundColor: 'transparent', borderColor: theme.primary }
        : { backgroundColor: 'transparent', borderColor: theme.missed };

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      {/* Without a label this is silence for a pending dose and a stray "✓" for a taken one —
          the most important fact on the row, unreadable. */}
      <View
        style={[styles.circle, circleStyle]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${doseName}: ${STATE_DESCRIPTION[state]}`}>
        {state === 'taken' ? (
          <ThemedText style={styles.check} accessibilityElementsHidden importantForAccessibility="no">
            ✓
          </ThemedText>
        ) : null}
      </View>

      <ThemedText
        type="small"
        themeColor={state === 'pending' ? 'text' : 'textSecondary'}
        style={styles.time}
        accessibilityElementsHidden
        importantForAccessibility="no">
        {formatTime(time)}
      </ThemedText>

      {state === 'taken' ? (
        // A status, not a control — hidden, since the circle already announced it. Otherwise a
        // screen reader hears "Taken" twice with no way to tell the label from the button.
        <ThemedText
          type="small"
          style={{ color: theme.taken }}
          accessibilityElementsHidden
          importantForAccessibility="no">
          Taken
        </ThemedText>
      ) : state === 'skipped' ? (
        // Skipped is locked; Missed stays open to a late Taken (PRD §5.2).
        <ThemedText
          type="small"
          style={{ color: theme.missed }}
          accessibilityElementsHidden
          importantForAccessibility="no">
          Not taken
        </ThemedText>
      ) : state === 'missed' ? (
        <Pressable
          onPress={onTaken}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`Log ${doseName} as taken`}>
          <ThemedText type="small" style={{ color: theme.missed }}>
            Not taken · log it
          </ThemedText>
        </Pressable>
      ) : (
        <ThemedView type="backgroundElement" style={styles.actions}>
          <Pressable
            onPress={onTaken}
            style={[styles.takeButton, { backgroundColor: theme.primary }]}
            accessibilityRole="button"
            accessibilityLabel={`Log ${doseName} as taken`}>
            <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
              Taken
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={onSkip}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Skip ${doseName}`}>
            <ThemedText themeColor="textSecondary" type="small">
              Skip
            </ThemedText>
          </Pressable>
        </ThemedView>
      )}
    </ThemedView>
  );
}

/* Android's guidance is a 48dp target. "Skip" is small text, so it leans on hit slop to get
   there — worth having for a tremor, and this condition skews older. */
const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

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
