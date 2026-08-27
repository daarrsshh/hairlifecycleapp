import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { RoutineItemType } from '@/features/dose-log/doseState';
import { ITEM_TYPE_LABEL, findCatalogEntry, searchCatalog } from '@/features/routine/catalog';
import { TimesEditor } from '@/features/routine/components/times-editor';
import { WeekdayPicker } from '@/features/routine/components/weekday-picker';
import { describeSchedule } from '@/features/routine/describe';
import { useRoutineDraft } from '@/features/routine/draft-store';
import { useTheme } from '@/hooks/use-theme';

const TYPES: RoutineItemType[] = ['oral', 'topical', 'device'];

/**
 * Add or edit one routine item. Same flow for every type — the type only changes labelling,
 * never the interaction (spec §7). Picking a known treatment pre-fills a sensible schedule so
 * the common case is a few taps, but every field stays editable.
 */
export default function RoutineItemScreen() {
  const theme = useTheme();
  const { index } = useLocalSearchParams<{ index?: string }>();
  const draft = useRoutineDraft();

  const editingIndex = index !== undefined ? Number(index) : null;
  const existing = editingIndex !== null ? draft.items[editingIndex] : undefined;

  const [type, setType] = useState<RoutineItemType>(existing?.type ?? 'topical');
  const [name, setName] = useState(existing?.name ?? '');
  const [dosage, setDosage] = useState(existing?.dosage ?? '');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(existing?.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);
  const [times, setTimes] = useState<string[]>(existing?.times ?? ['08:00']);

  // Once the schedule has been edited by hand, catalog defaults stop overwriting it. Editing an
  // existing item counts as already-set, so reopening it never resets the user's own schedule.
  const scheduleTouched = useRef(existing !== undefined);

  const suggestions = name.trim() ? searchCatalog(name).slice(0, 4) : [];
  const exactMatch = findCatalogEntry(name);
  const dosageSuggestions = exactMatch?.dosageSuggestions ?? [];
  const canSave = name.trim().length > 0 && daysOfWeek.length > 0 && times.length > 0;

  /** Fills in a known treatment's usual type and schedule as a starting point. */
  function applyCatalogDefaults(entryName: string) {
    const entry = findCatalogEntry(entryName);
    if (!entry || scheduleTouched.current) return;
    setType(entry.type);
    setDaysOfWeek(entry.defaultDaysOfWeek);
    setTimes(entry.defaultTimes);
  }

  /**
   * Applied on every keystroke, not just when a suggestion chip is tapped — typing "Minoxidil"
   * in full hides the chips (it's an exact match), which previously meant its twice-daily
   * default was silently skipped and the item was saved as once a day.
   */
  function handleNameChange(next: string) {
    setName(next);
    applyCatalogDefaults(next);
  }

  function save() {
    const item = {
      type,
      name: name.trim(),
      dosage: dosage.trim() || null,
      daysOfWeek,
      times,
    };
    if (editingIndex !== null) draft.updateItem(editingIndex, item);
    else draft.addItem(item);
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{ headerShown: true, title: editingIndex !== null ? 'Edit item' : 'Add to routine' }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">What is it?</ThemedText>
          <TextInput
            value={name}
            onChangeText={handleNameChange}
            placeholder="e.g. Minoxidil"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          {suggestions.length > 0 && !exactMatch ? (
            <ThemedView style={styles.chipRow}>
              {suggestions.map((entry) => (
                <Pressable
                  key={entry.name}
                  onPress={() => handleNameChange(entry.name)}
                  style={[styles.chip, { borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {entry.name}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          ) : null}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Type</ThemedText>
          <ThemedView style={styles.chipRow}>
            {TYPES.map((t) => {
              const selected = type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.chip,
                    { borderColor: theme.border },
                    selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}>
                  <ThemedText
                    type="small"
                    style={selected ? { color: theme.onPrimary } : undefined}
                    themeColor={selected ? undefined : 'textSecondary'}>
                    {ITEM_TYPE_LABEL[t]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Strength or dose</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Optional — skip it if you&apos;d rather not.
          </ThemedText>
          <TextInput
            value={dosage}
            onChangeText={setDosage}
            placeholder="e.g. 5%"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          {dosageSuggestions.length > 0 ? (
            <ThemedView style={styles.chipRow}>
              {dosageSuggestions.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDosage(d)}
                  style={[styles.chip, { borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {d}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          ) : null}
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">Which days?</ThemedText>
          <WeekdayPicker
            value={daysOfWeek}
            onChange={(days) => {
              scheduleTouched.current = true;
              setDaysOfWeek(days);
            }}
          />
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold">What time?</ThemedText>
          <TimesEditor
            value={times}
            onChange={(next) => {
              scheduleTouched.current = true;
              setTimes(next);
            }}
          />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.preview}>
          <ThemedText themeColor="textSecondary" type="small">
            Preview
          </ThemedText>
          <ThemedText type="smallBold">
            {name.trim() || 'Your item'}
            {dosage.trim() ? ` · ${dosage.trim()}` : ''}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {describeSchedule(daysOfWeek, times)}
          </ThemedText>
        </ThemedView>

        <Pressable
          disabled={!canSave}
          onPress={save}
          style={[styles.button, { backgroundColor: theme.primary, opacity: canSave ? 1 : 0.4 }]}>
          <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
            {editingIndex !== null ? 'Save changes' : 'Add to routine'}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  section: { gap: Spacing.two },
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
  preview: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  button: { paddingVertical: Spacing.three, borderRadius: Spacing.three, alignItems: 'center' },
});
