import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getPhotosByAngle, type PhotoAngle } from '@/features/photos/api';
import { ComparisonSideBySide } from '@/features/photos/components/comparison-side-by-side';
import { ComparisonSlider } from '@/features/photos/components/comparison-slider';
import { describePhotoTiming } from '@/features/photos/photo-sets';
import { findClosestPhoto } from '@/features/photos/quick-pick';
import { getAllRoutines } from '@/features/routine/api';
import { useTheme } from '@/hooks/use-theme';
import { addDays, daysBetween, today } from '@/lib/date';

const ANGLES: { value: PhotoAngle; label: string }[] = [
  { value: 'crown', label: 'Crown' },
  { value: 'hairline', label: 'Hairline' },
  { value: 'left_temple', label: 'Left temple' },
  { value: 'right_temple', label: 'Right temple' },
];

type Mode = 'slider' | 'side-by-side';

const MODES: { value: Mode; label: string }[] = [
  { value: 'slider', label: 'Slider' },
  { value: 'side-by-side', label: 'Side by side' },
];

const SLIDER_SIZE = Math.min(Dimensions.get('window').width - Spacing.four * 2, 400);
const THUMB_SIZE = 52;

export default function ComparePhotosScreen() {
  const [angle, setAngle] = useState<PhotoAngle>('crown');
  const [mode, setMode] = useState<Mode>('slider');
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);

  const { data: photos } = useQuery({
    queryKey: ['photos', 'angle', angle],
    queryFn: () => getPhotosByAngle(angle),
  });

  // The first routine's start is day 0, so chips read "Day 47" the way the Photos tab does.
  const { data: routines } = useQuery({ queryKey: ['routines'], queryFn: getAllRoutines });
  const earliestStart = routines?.[0]?.startDate ?? null;

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
          {ANGLES.map((a) => (
            <Chip
              key={a.value}
              label={a.label}
              selected={angle === a.value}
              onPress={() => {
                setAngle(a.value);
                setFromId(null);
                setToId(null);
              }}
            />
          ))}
        </ThemedView>

        {list.length < 2 ? (
          <ThemedText themeColor="textSecondary">
            Need at least two {angle.replace('_', ' ')} photos to compare.
          </ThemedText>
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
              <PhotoPicker
                label="From"
                photos={list}
                selectedId={fromId}
                onSelect={setFromId}
                startDate={earliestStart}
              />
              <PhotoPicker
                label="To"
                photos={list}
                selectedId={toId}
                onSelect={setToId}
                startDate={earliestStart}
              />
            </ThemedView>

            {from && to ? (
              <ThemedView style={styles.comparison}>
                <ThemedView style={styles.chipRow}>
                  {MODES.map((m) => (
                    <Chip
                      key={m.value}
                      label={m.label}
                      selected={mode === m.value}
                      onPress={() => setMode(m.value)}
                    />
                  ))}
                </ThemedView>

                <ThemedText themeColor="textSecondary" type="small">
                  {Math.abs(daysBetween(from.date, to.date))} days apart
                  {from.routineId !== to.routineId ? ' · treatment changed in between' : ''}
                </ThemedText>

                {mode === 'slider' ? (
                  <ComparisonSlider
                    beforeUri={from.filePath}
                    afterUri={to.filePath}
                    beforeLabel={describePhotoTiming(from.date, earliestStart)}
                    afterLabel={describePhotoTiming(to.date, earliestStart)}
                    width={SLIDER_SIZE}
                    height={SLIDER_SIZE}
                  />
                ) : (
                  <ComparisonSideBySide
                    beforeUri={from.filePath}
                    afterUri={to.filePath}
                    beforeLabel={describePhotoTiming(from.date, earliestStart)}
                    afterLabel={describePhotoTiming(to.date, earliestStart)}
                    width={SLIDER_SIZE}
                    height={SLIDER_SIZE}
                  />
                )}

                <ThemedText themeColor="textSecondary" type="caption">
                  {mode === 'slider' ? 'Drag the handle · ' : ''}Pinch to zoom, double-tap to reset
                </ThemedText>
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

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: theme.border },
        selected && { backgroundColor: theme.primary, borderColor: theme.primary },
      ]}>
      <ThemedText
        type="small"
        style={selected ? { color: theme.onPrimary } : undefined}
        themeColor={selected ? undefined : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/**
 * Thumbnails, not date strings. This screen exists to compare images, so choosing them by
 * `2026-08-14` alone made the one thing you need to see — what the photo actually looks like —
 * the one thing the picker withheld.
 */
function PhotoPicker({
  label,
  photos,
  selectedId,
  onSelect,
  startDate,
}: {
  label: string;
  photos: { id: string; date: string; filePath: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  startDate: string | null;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.pickerColumn}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ThemedView style={styles.pickerOptions}>
          {photos.map((p) => {
            const selected = selectedId === p.id;
            return (
              <Pressable key={p.id} onPress={() => onSelect(p.id)} style={styles.thumbOption}>
                <Image
                  source={{ uri: p.filePath }}
                  style={[
                    styles.thumb,
                    { borderColor: selected ? theme.primary : theme.border },
                    selected && styles.thumbSelected,
                  ]}
                  contentFit="cover"
                />
                <ThemedText
                  type="caption"
                  themeColor={selected ? 'primary' : 'textSecondary'}
                  numberOfLines={1}>
                  {describePhotoTiming(p.date, startDate)}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  quickPickRow: { flexDirection: 'row', gap: Spacing.four },
  pickerRow: { gap: Spacing.three },
  pickerColumn: { gap: Spacing.one },
  pickerOptions: { flexDirection: 'row', gap: Spacing.two },
  thumbOption: { alignItems: 'center', gap: Spacing.half, width: THUMB_SIZE + Spacing.two },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: Spacing.two, borderWidth: 1 },
  thumbSelected: { borderWidth: 2 },
  comparison: { gap: Spacing.two, alignItems: 'center' },
});
