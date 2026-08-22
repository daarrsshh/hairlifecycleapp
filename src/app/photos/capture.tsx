import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { captureCurrentPhoto, type PhotoAngle } from '@/features/photos/api';
import { setLastPhotoSetDate } from '@/features/onboarding/settings-api';
import { useTheme } from '@/hooks/use-theme';
import { today } from '@/lib/date';

const ANGLES: { value: PhotoAngle; label: string }[] = [
  { value: 'crown', label: 'Crown' },
  { value: 'hairline', label: 'Hairline' },
  { value: 'left_temple', label: 'Left temple' },
  { value: 'right_temple', label: 'Right temple' },
];

export default function CapturePhotosScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [captured, setCaptured] = useState<Partial<Record<PhotoAngle, string>>>({});
  const [saving, setSaving] = useState(false);

  async function capture(angle: PhotoAngle) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    const result = permission.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setCaptured((prev) => ({ ...prev, [angle]: result.assets[0].uri }));
    }
  }

  async function save() {
    setSaving(true);
    try {
      const entries = Object.entries(captured) as [PhotoAngle, string][];
      await Promise.all(entries.map(([angle, uri]) => captureCurrentPhoto(uri, angle)));
      if (entries.length === ANGLES.length) {
        await setLastPhotoSetDate(today());
      }
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const hasAny = Object.keys(captured).length > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText themeColor="textSecondary" type="small">
          Line up each angle the same way as last time for the clearest comparison.
        </ThemedText>

        <ThemedView style={styles.grid}>
          {ANGLES.map((angle) => (
            <Pressable
              key={angle.value}
              onPress={() => capture(angle.value)}
              style={[styles.angleCard, { borderColor: theme.border }]}>
              {captured[angle.value] ? (
                <Image source={{ uri: captured[angle.value] }} style={StyleSheet.absoluteFill} />
              ) : (
                <ThemedText themeColor="textSecondary" type="small">
                  Tap to add
                </ThemedText>
              )}
              <ThemedText type="small" style={styles.angleLabel}>
                {angle.label}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        <Pressable
          disabled={!hasAny || saving}
          style={[styles.button, { backgroundColor: theme.primary, opacity: hasAny ? 1 : 0.4 }]}
          onPress={save}>
          <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
            {saving ? 'Saving…' : 'Save'}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingTop: Spacing.three },
  angleCard: {
    width: '47%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  angleLabel: { position: 'absolute', bottom: Spacing.one },
  button: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
