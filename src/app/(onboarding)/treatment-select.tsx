import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useOnboardingDraft } from '@/features/onboarding/draft-store';
import { TREATMENT_PRESETS } from '@/features/treatment/presets';
import { useTheme } from '@/hooks/use-theme';

export default function TreatmentSelectScreen() {
  const theme = useTheme();
  const setTreatment = useOnboardingDraft((s) => s.setTreatment);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText themeColor="textSecondary" type="small">
          Pick what you&apos;re doing — you can change this any time.
        </ThemedText>

        <ThemedView style={styles.list}>
          {TREATMENT_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              style={[styles.card, { borderColor: theme.border }]}
              onPress={() => {
                setTreatment({ planType: preset.id, drugs: preset.drugs });
                router.push('/(onboarding)/reminder-times');
              }}>
              <ThemedText type="smallBold">{preset.label}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {preset.description}
              </ThemedText>
            </Pressable>
          ))}

          <Pressable
            style={[styles.card, { borderColor: theme.border }]}
            onPress={() => router.push('/(onboarding)/treatment-custom')}>
            <ThemedText type="smallBold">Add my own</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Set up a custom drug, dosage, and schedule.
            </ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, gap: Spacing.three, paddingTop: Spacing.three },
  list: { gap: Spacing.two },
  card: { borderWidth: 1, borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.half },
});
