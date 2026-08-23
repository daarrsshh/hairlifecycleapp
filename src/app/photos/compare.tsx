import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ComparisonSlider } from '@/features/photos/components/comparison-slider';
import { getPhotosByAngle, type PhotoAngle } from '@/features/photos/api';
import { findClosestPhoto } from '@/features/photos/quick-pick';
import { useTheme } from '@/hooks/use-theme';
import { addDays, daysBetween, today } from '@/lib/date';

const ANGLES: { value: PhotoAngle; label: string }[] = [
  { value: 'crown', label: 'Crown' },
  { value: 'hairline', label: 'Hairline' },
  { value: 'left_temple', label: 'Left temple' },
  { value: 'right_temple', label: 'Right temple' },
];

const SLIDER_SIZE = Math.min(Dimensions.get('window').width - Spacing.four * 2, 400);

export default function ComparePhotosScreen() {
  const theme = useTheme();
  const [angle, setAngle] = useState<PhotoAngle>('crown');
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);

  const { data: photos } = useQuery({
    queryKey: ['photos', 'angle', angle],
    queryFn: () => getPhotosByAngle(angle),
  });

  const list = photos ?? [];
  const from = list.find((p) => p.id === fromId) ?? null;
  const to = list.find((p) => p.id === toId) ?? null;

  function pickDay0VsToday() {
    if (list.length === 0) return;
    setFromId(list[0].id);
    setToId(list[list.length - 1].id);
  }

  function pickLastMonthVsToday() {
    if (list.length === 0) return;
    const closest = findClosestPhoto(list, addDays(today(), -30));
    setFromId(closest?.id ?? list[0].id);
    setToId(list[list.length - 1].id);
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Compare' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedView style={styles.chipRow}>
          {ANGLES.map((a) => {
            const selected = angle === a.value;
            return (
              <Pressable
                key={a.value}
                onPress={() => {
                  setAngle(a.value);
                  setFromId(null);
                  setToId(null);
                }}
                style={[
                  styles.chip,
                  { borderColor: theme.border },
                  selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}>
                <ThemedText
                  type="small"
                  style={selected ? { color: theme.onPrimary } : undefined}
                  themeColor={selected ? undefined : 'textSecondary'}>
                  {a.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        {list.length < 2 ? (
          <ThemedText themeColor="textSecondary">Need at least two {angle.replace('_', ' ')} photos to compare.</ThemedText>
        ) : (
          <>
            <ThemedView style={styles.quickPickRow}>
              <Pressable onPress={pickDay0VsToday}>
                <ThemedText type="linkPrimary">Day 0 vs Today</ThemedText>
              </Pressable>
              <Pressable onPress={pickLastMonthVsToday}>
                <ThemedText type="linkPrimary">Last Month vs Today</ThemedText>
              </Pressable>
            </ThemedView>

            <ThemedView style={styles.pickerRow}>
              <PhotoPicker label="From" photos={list} selectedId={fromId} onSelect={setFromId} />
              <PhotoPicker label="To" photos={list} selectedId={toId} onSelect={setToId} />
            </ThemedView>

            {from && to ? (
              <ThemedView style={styles.comparison}>
                <ThemedText themeColor="textSecondary" type="small">
                  {Math.abs(daysBetween(from.date, to.date))} days apart
                  {from.routineId !== to.routineId ? ' · treatment changed in between' : ''}
                </ThemedText>
                <ComparisonSlider
                  beforeUri={from.filePath}
                  afterUri={to.filePath}
                  width={SLIDER_SIZE}
                  height={SLIDER_SIZE}
                />
              </ThemedView>
            ) : (
              <ThemedText themeColor="textSecondary" type="small">
                Pick a From and To photo, or use a shortcut above.
              </ThemedText>
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function PhotoPicker({
  label,
  photos,
  selectedId,
  onSelect,
}: {
  label: string;
  photos: { id: string; date: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.pickerColumn}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ThemedView style={styles.pickerOptions}>
          {photos.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onSelect(p.id)}
              style={[
                styles.dateChip,
                { borderColor: theme.border },
                selectedId === p.id && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}>
              <ThemedText
                type="small"
                style={selectedId === p.id ? { color: theme.onPrimary } : undefined}
                themeColor={selectedId === p.id ? undefined : 'textSecondary'}>
                {p.date}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: Spacing.five, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  quickPickRow: { flexDirection: 'row', gap: Spacing.four },
  pickerRow: { gap: Spacing.two },
  pickerColumn: { gap: Spacing.one },
  pickerOptions: { flexDirection: 'row', gap: Spacing.one },
  dateChip: { borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  comparison: { gap: Spacing.two, alignItems: 'center' },
});
