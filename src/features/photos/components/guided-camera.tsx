import { useQuery } from '@tanstack/react-query';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GuidedCameraOverlay } from '@/features/photos/components/guided-camera-overlay';
import { getPhotosByAngle, type PhotoAngle } from '@/features/photos/api';

const GHOST_OPACITY = 0.4;

export function GuidedCamera({
  angle,
  onCapture,
  onCancel,
  onPickFromLibrary,
}: {
  angle: PhotoAngle;
  onCapture: (uri: string) => void;
  onCancel: () => void;
  onPickFromLibrary: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  // Hairline and temple shots are usually easier facing yourself; crown usually isn't.
  const [facing, setFacing] = useState<CameraType>('back');
  const [ghostVisible, setGhostVisible] = useState(true);

  /**
   * The last shot at this angle, drawn faintly over the live preview so the framing can be
   * matched. This is the feature the whole comparison flow rests on: two photos taken from
   * different distances or angles can't be compared at all, and no amount of work on the
   * Compare screen fixes a misaligned pair after the fact. There's none on a first capture,
   * which is exactly right — there's nothing to match yet.
   */
  const { data: previousPhotos } = useQuery({
    queryKey: ['photos', 'angle', angle],
    queryFn: () => getPhotosByAngle(angle),
  });
  const ghostUri = previousPhotos?.[previousPhotos.length - 1]?.filePath ?? null;

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <ThemedView style={styles.permissionContainer}>
        <ThemedText themeColor="textSecondary" style={styles.permissionText}>
          Camera access lets you line up each photo the same way every time.
        </ThemedText>
        <Pressable onPress={requestPermission}>
          <ThemedText type="linkPrimary">Allow camera</ThemedText>
        </Pressable>
        <Pressable onPress={onCancel}>
          <ThemedText themeColor="textSecondary">Cancel</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  async function capture() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    if (photo) onCapture(photo.uri);
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {ghostUri && ghostVisible ? (
        <Image
          source={{ uri: ghostUri }}
          style={[StyleSheet.absoluteFill, styles.ghost]}
          contentFit="cover"
          pointerEvents="none"
        />
      ) : null}

      <GuidedCameraOverlay angle={angle} />

      <View style={styles.topBar}>
        <Pressable onPress={onCancel} hitSlop={12}>
          <ThemedText style={styles.overlayText}>Cancel</ThemedText>
        </Pressable>
        <Pressable onPress={onPickFromLibrary} hitSlop={12}>
          <ThemedText style={styles.overlayText}>Choose from library</ThemedText>
        </Pressable>
      </View>

      {/* Toggling matters as much as the overlay itself — you line the shot up with it on, then
          turn it off to check what the camera is actually seeing. */}
      {ghostUri ? (
        <Pressable
          onPress={() => setGhostVisible((v) => !v)}
          hitSlop={12}
          style={styles.ghostToggle}
          accessibilityLabel={ghostVisible ? 'Hide last photo overlay' : 'Show last photo overlay'}>
          <ThemedText type="small" style={styles.overlayText}>
            {ghostVisible ? 'Hide last photo' : 'Show last photo'}
          </ThemedText>
        </Pressable>
      ) : null}

      <View style={styles.controls}>
        <View style={styles.controlSide} />
        <Pressable onPress={capture} style={styles.shutterOuter} accessibilityLabel="Take photo">
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.controlSide}>
          <Pressable
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            hitSlop={12}
            accessibilityLabel="Flip camera"
            style={styles.flipButton}>
            <SymbolView
              name={{
                ios: 'arrow.triangle.2.circlepath.camera',
                android: 'flip_camera_android',
                web: 'flip_camera_android',
              }}
              size={26}
              tintColor="#fff"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  permissionText: { textAlign: 'center' },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  // Equal-width flanks keep the shutter centred with only one side occupied.
  controlSide: { width: 56, alignItems: 'center' },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  ghost: { opacity: GHOST_OPACITY },
  ghostToggle: {
    position: 'absolute',
    top: 96,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overlayText: { color: '#fff' },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
});
