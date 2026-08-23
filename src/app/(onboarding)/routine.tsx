import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { RoutineBuilder } from '@/features/routine/components/routine-builder';
import { useRoutineDraft } from '@/features/routine/draft-store';
import { useTheme } from '@/hooks/use-theme';

export default function OnboardingRoutineScreen() {
  const theme = useTheme();
  const items = useRoutineDraft((s) => s.items);
  const canContinue = items.length > 0;

  return (
    <RoutineBuilder
      headerText="Build your routine. Add everything you're using — each one gets its own days and times, so a daily pill and a Mon/Wed/Fri device both fit."
      footer={
        <Pressable
          disabled={!canContinue}
          onPress={() => router.push('/(onboarding)/baseline-photos')}
          style={[styles.button, { backgroundColor: theme.primary, opacity: canContinue ? 1 : 0.4 }]}>
          <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
            Continue
          </ThemedText>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
});
