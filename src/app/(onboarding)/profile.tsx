import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useOnboardingDraft } from '@/features/onboarding/draft-store';
import { useTheme } from '@/hooks/use-theme';

const HAIR_LOSS_TYPES = ['Receding hairline', 'Thinning crown', 'Overall thinning', 'Not sure'];

export default function ProfileScreen() {
  const theme = useTheme();
  const setProfile = useOnboardingDraft((s) => s.setProfile);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [hairLossType, setHairLossType] = useState<string | null>(null);

  const canContinue = name.trim().length > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.form}>
          <ThemedText themeColor="textSecondary" type="small">
            What should we call you?
          </ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />

          <ThemedText themeColor="textSecondary" type="small" style={styles.fieldSpacing}>
            Age (optional)
          </ThemedText>
          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="Age"
            keyboardType="number-pad"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />

          <ThemedText themeColor="textSecondary" type="small" style={styles.fieldSpacing}>
            What best describes what you&apos;re seeing? (optional)
          </ThemedText>
          <ThemedView style={styles.chipRow}>
            {HAIR_LOSS_TYPES.map((type) => {
              const selected = hairLossType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setHairLossType(selected ? null : type)}
                  style={[
                    styles.chip,
                    { borderColor: theme.border },
                    selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}>
                  <ThemedText
                    type="small"
                    style={selected ? { color: theme.onPrimary } : undefined}
                    themeColor={selected ? undefined : 'textSecondary'}>
                    {type}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
          <ThemedText themeColor="textSecondary" type="small">
            This just helps us show you relevant milestones — it isn&apos;t a diagnosis.
          </ThemedText>
        </ThemedView>

        <Pressable
          disabled={!canContinue}
          style={[styles.button, { backgroundColor: theme.primary, opacity: canContinue ? 1 : 0.4 }]}
          onPress={() => {
            setProfile({ name: name.trim(), age: age ? Number(age) : null, hairLossType });
            router.push('/(onboarding)/treatment-select');
          }}>
          <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
            Continue
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    justifyContent: 'space-between',
  },
  form: { gap: Spacing.two, paddingTop: Spacing.four },
  fieldSpacing: { marginTop: Spacing.three },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
