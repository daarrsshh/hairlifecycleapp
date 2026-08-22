import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { DoseSlot } from '@/features/dose-log/doseState';
import { useStartNewTreatmentDraft } from '@/features/treatment/start-new-draft-store';
import type { PresetDrug } from '@/features/treatment/presets';
import { useTheme } from '@/hooks/use-theme';

const SLOT_OPTIONS: { value: DoseSlot | 'both'; label: string }[] = [
  { value: 'am', label: 'Morning' },
  { value: 'pm', label: 'Evening' },
  { value: 'both', label: 'Both' },
];

export default function StartNewTreatmentCustomScreen() {
  const theme = useTheme();
  const setDraft = useStartNewTreatmentDraft((s) => s.set);
  const [drugName, setDrugName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [slot, setSlot] = useState<DoseSlot | 'both'>('am');
  const [drugs, setDrugs] = useState<PresetDrug[]>([]);

  const canContinue = drugs.length > 0 || drugName.trim().length > 0;

  function addDrug() {
    if (!drugName.trim()) return;
    setDrugs((prev) => [...prev, { drugName: drugName.trim(), dosage, frequency, slot }]);
    setDrugName('');
    setDosage('');
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Add my own' }} />
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.form}>
          {drugs.map((d, i) => (
            <ThemedView key={i} type="backgroundElement" style={styles.drugRow}>
              <ThemedText type="smallBold">{d.drugName}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {d.dosage || 'No dosage set'} · {d.frequency} ·{' '}
                {SLOT_OPTIONS.find((o) => o.value === d.slot)?.label}
              </ThemedText>
            </ThemedView>
          ))}

          <TextInput
            value={drugName}
            onChangeText={setDrugName}
            placeholder="Drug name"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <TextInput
            value={dosage}
            onChangeText={setDosage}
            placeholder="Dosage (optional)"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          <TextInput
            value={frequency}
            onChangeText={setFrequency}
            placeholder="Frequency"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />

          <ThemedView style={styles.chipRow}>
            {SLOT_OPTIONS.map((opt) => {
              const selected = slot === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSlot(opt.value)}
                  style={[
                    styles.chip,
                    { borderColor: theme.border },
                    selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}>
                  <ThemedText
                    type="small"
                    style={selected ? { color: theme.onPrimary } : undefined}
                    themeColor={selected ? undefined : 'textSecondary'}>
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>

          <Pressable onPress={addDrug}>
            <ThemedText type="linkPrimary">+ Add another</ThemedText>
          </Pressable>
        </ThemedView>

        <Pressable
          disabled={!canContinue}
          style={[styles.button, { backgroundColor: theme.primary, opacity: canContinue ? 1 : 0.4 }]}
          onPress={() => {
            const finalDrugs = drugName.trim()
              ? [...drugs, { drugName: drugName.trim(), dosage, frequency, slot }]
              : drugs;
            setDraft({ planType: 'custom', drugs: finalDrugs });
            router.push('/treatment/confirm');
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
  form: { gap: Spacing.two, paddingTop: Spacing.three },
  drugRow: { padding: Spacing.two, borderRadius: Spacing.two, gap: Spacing.half },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  chipRow: { flexDirection: 'row', gap: Spacing.two },
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
