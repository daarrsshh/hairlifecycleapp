import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useStartNewTreatmentDraft } from '@/features/treatment/start-new-draft-store';
import { TREATMENT_PRESETS } from '@/features/treatment/presets';
import { useTheme } from '@/hooks/use-theme';

export default function StartNewTreatmentScreen() {
  const theme = useTheme();
  const setDraft = useStartNewTreatmentDraft((s) => s.set);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText themeColor="textSecondary" type="small">
          Pick what you&apos;re switching to.
        </ThemedText>

        <ThemedView style={styles.list}>
          {TREATMENT_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              style={[styles.card, { borderColor: theme.border }]}
              onPress={() => {
                setDraft({ planType: preset.id, drugs: preset.drugs });
                router.push('/treatment/confirm');
              }}>
              <ThemedText type="smallBold">{preset.label}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {preset.description}
              </ThemedText>
            </Pressable>
          ))}

          <Pressable
            style={[styles.card, { borderColor: theme.border }]}
            onPress={() => router.push('/treatment/start-new-custom')}>
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
