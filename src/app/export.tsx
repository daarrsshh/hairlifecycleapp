import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { generateAndShareExport } from '@/features/export/api';
import type { ExportRangeOption } from '@/features/export/resolve-range';
import { useTheme } from '@/hooks/use-theme';
import { toDateString, today } from '@/lib/date';

const RANGE_OPTIONS: { value: ExportRangeOption; label: string }[] = [
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'all-time', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

export default function ExportScreen() {
  const theme = useTheme();
  const [range, setRange] = useState<ExportRangeOption>('last-month');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [customFrom, setCustomFrom] = useState(today());
  const [customTo, setCustomTo] = useState(today());
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      await generateAndShareExport({
        rangeOption: range,
        custom: range === 'custom' ? { from: customFrom, to: customTo } : undefined,
        includePhotos,
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.form}>
          <ThemedText type="smallBold">Date range</ThemedText>
          <ThemedView style={styles.chipRow}>
            {RANGE_OPTIONS.map((opt) => {
              const selected = range === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setRange(opt.value)}
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

          {range === 'custom' ? (
            <ThemedView style={styles.customRow}>
              <Pressable style={[styles.dateButton, { borderColor: theme.border }]} onPress={() => setPickerTarget('from')}>
                <ThemedText type="small" themeColor="textSecondary">From</ThemedText>
                <ThemedText type="smallBold">{customFrom}</ThemedText>
              </Pressable>
              <Pressable style={[styles.dateButton, { borderColor: theme.border }]} onPress={() => setPickerTarget('to')}>
                <ThemedText type="small" themeColor="textSecondary">To</ThemedText>
                <ThemedText type="smallBold">{customTo}</ThemedText>
              </Pressable>
            </ThemedView>
          ) : null}

          {pickerTarget ? (
            <DateTimePicker
              value={new Date(pickerTarget === 'from' ? customFrom : customTo)}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, date) => {
                setPickerTarget(null);
                if (!date) return;
                if (pickerTarget === 'from') setCustomFrom(toDateString(date));
                else setCustomTo(toDateString(date));
              }}
            />
          ) : null}

          <Pressable style={styles.toggleRow} onPress={() => setIncludePhotos((v) => !v)}>
            <ThemedText type="smallBold">Include photos</ThemedText>
            <ThemedView
              type="backgroundElement"
              style={[styles.toggle, includePhotos && { backgroundColor: theme.primary }]}>
              <ThemedText type="small" style={includePhotos ? { color: theme.onPrimary } : undefined}>
                {includePhotos ? 'On' : 'Off'}
              </ThemedText>
            </ThemedView>
          </Pressable>

          <ThemedText themeColor="textSecondary" type="small">
            Photos are grouped by angle and ordered chronologically, so a doctor can review one
            angle&apos;s progression at a time. The consistency summary is always included.
          </ThemedText>
        </ThemedView>

        <Pressable
          disabled={generating}
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={generate}>
          <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
            {generating ? 'Generating…' : 'Export PDF'}
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
  form: { gap: Spacing.three, paddingTop: Spacing.three },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: Spacing.five, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  customRow: { flexDirection: 'row', gap: Spacing.two },
  dateButton: { flex: 1, borderWidth: 1, borderRadius: Spacing.three, padding: Spacing.two, gap: Spacing.half },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggle: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.four },
  button: { paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
});
