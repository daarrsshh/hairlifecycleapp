import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { DoseState } from '@/features/dose-log/doseState';
import { useTheme } from '@/hooks/use-theme';

/**
 * Shown only on items due more than once today, so the same name appearing in two time blocks
 * reads as "the second of two doses" rather than as a duplicate entry. One pip per dose in
 * time order, with the dose this card represents ringed.
 */
export function DosePips({
  states,
  currentIndex,
}: {
  states: DoseState[];
  currentIndex: number;
}) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.pips}>
        {states.map((state, index) => (
          <View
            key={index}
            style={[
              styles.pip,
              {
                backgroundColor: state === 'taken' ? theme.taken : 'transparent',
                borderColor: index === currentIndex ? theme.primary : theme.missed,
                borderWidth: index === currentIndex ? 2 : 1,
              },
            ]}
          />
        ))}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Dose {currentIndex + 1} of {states.length}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pips: { flexDirection: 'row', gap: Spacing.one },
  pip: { width: 10, height: 10, borderRadius: 5 },
});
