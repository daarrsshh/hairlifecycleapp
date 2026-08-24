import * as ImagePicker from 'expo-image-picker';
import { useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { PhotoAngle } from '@/features/photos/api';
import { GuidedCamera } from '@/features/photos/components/guided-camera';
import { useTheme } from '@/hooks/use-theme';

export const CAPTURE_ANGLES: { value: PhotoAngle; label: string }[] = [
  { value: 'crown', label: 'Crown' },
  { value: 'hairline', label: 'Hairline' },
  { value: 'left_temple', label: 'Left temple' },
  { value: 'right_temple', label: 'Right temple' },
];

export type CapturedPhotos = Partial<Record<PhotoAngle, string>>;

/**
 * The shared 4-angle guided-capture grid used by both onboarding's baseline photos and the
 * standalone "Add photos" flow. Tapping an angle opens the full-screen GuidedCamera (with a
 * "choose from library" fallback for simulators/no-camera-permission); once any angle has a
 * photo, `onSave` becomes available.
 */
export function AngleCaptureFlow({
  headerText,
  saveLabel,
  onSave,
  saving,
  footer,
  initialPhotos,
}: {
  headerText: string;
  saveLabel: string;
  onSave: (captured: CapturedPhotos) => void | Promise<void>;
  saving: boolean;
  footer?: (captured: CapturedPhotos) => ReactNode;
  /** Angles already captured for this set, so re-opening shows the existing shots. */
  initialPhotos?: CapturedPhotos;
}) {
  const theme = useTheme();
  const [captured, setCaptured] = useState<CapturedPhotos>(initialPhotos ?? {});
  const [activeAngle, setActiveAngle] = useState<PhotoAngle | null>(null);

  async function pickFromLibrary(angle: PhotoAngle) {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setCaptured((prev) => ({ ...prev, [angle]: result.assets[0].uri }));
    }
    setActiveAngle(null);
  }

  if (activeAngle) {
    return (
      <GuidedCamera
        angle={activeAngle}
        onCapture={(uri) => {
          setCaptured((prev) => ({ ...prev, [activeAngle]: uri }));
          setActiveAngle(null);
        }}
        onCancel={() => setActiveAngle(null)}
        onPickFromLibrary={() => pickFromLibrary(activeAngle)}
      />
    );
  }

  const hasAny = Object.keys(captured).length > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText themeColor="textSecondary" type="small">
          {headerText}
        </ThemedText>

        <ThemedView style={styles.grid}>
          {CAPTURE_ANGLES.map((angle) => {
            const uri = captured[angle.value];
            return (
              // The label sits below the tile rather than on top of it — overlaying it on a
              // square this small collided with the "Tap to add" placeholder.
              <ThemedView key={angle.value} style={styles.gridItem}>
                <Pressable
                  onPress={() => setActiveAngle(angle.value)}
                  style={[styles.angleCard, { borderColor: theme.border }]}>
                  {uri ? (
                    <Image source={{ uri }} style={StyleSheet.absoluteFill} />
                  ) : (
                    <ThemedText themeColor="textSecondary" type="small">
                      Tap to add
                    </ThemedText>
                  )}
                </Pressable>
                <ThemedView style={styles.labelRow}>
                  <ThemedText type="small">{angle.label}</ThemedText>
                  {uri ? <ThemedText style={{ color: theme.taken }}>✓</ThemedText> : null}
                </ThemedView>
              </ThemedView>
            );
          })}
        </ThemedView>

        <ThemedView style={styles.footer}>
          <Pressable
            disabled={!hasAny || saving}
            style={[styles.button, { backgroundColor: theme.primary, opacity: hasAny ? 1 : 0.4 }]}
            onPress={() => onSave(captured)}>
            <ThemedText style={{ color: theme.onPrimary }} type="smallBold">
              {saving ? 'Saving…' : saveLabel}
            </ThemedText>
          </Pressable>
          {footer?.(captured)}
        </ThemedView>
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
  gridItem: { width: '47%', gap: Spacing.one },
  angleCard: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  footer: { gap: Spacing.two, alignItems: 'center' },
  button: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
