import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Seven manual toggles — no forced presets, per spec §1 step 3. */
export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const theme = useTheme();

  function toggle(day: number) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  }

  return (
    <ThemedView style={styles.row}>
      {LABELS.map((label, day) => {
        const selected = value.includes(day);
        return (
          <Pressable
            key={day}
            onPress={() => toggle(day)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            style={[
              styles.day,
              { borderColor: theme.border },
              selected && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}>
            <ThemedText
              type="smallBold"
              style={selected ? { color: theme.onPrimary } : undefined}
              themeColor={selected ? undefined : 'textSecondary'}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.one, justifyContent: 'space-between' },
  day: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 44,
    borderWidth: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
