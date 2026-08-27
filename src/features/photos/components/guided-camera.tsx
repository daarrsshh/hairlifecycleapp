import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Icon } from '@/components/icon';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GuidedCameraOverlay } from '@/features/photos/components/guided-camera-overlay';
import type { PhotoAngle } from '@/features/photos/api';

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
  /*
   * Front camera by default. Three of the four angles — hairline and both temples — are shots
   * of your own face taken alone, so the back camera meant every capture started by flipping.
   * Crown is the awkward exception either way: you can't see the top of your own head on any
   * camera, so it's usually a mirror or another person. The flip control stays one tap away.
   */
  const [facing, setFacing] = useState<CameraType>('front');

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
      <GuidedCameraOverlay angle={angle} />

      <View style={styles.topBar}>
        <Pressable onPress={onCancel} hitSlop={12}>
          <ThemedText style={styles.overlayText}>Cancel</ThemedText>
        </Pressable>
        <Pressable onPress={onPickFromLibrary} hitSlop={12}>
          <ThemedText style={styles.overlayText}>Choose from library</ThemedText>
        </Pressable>
      </View>

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
            <Icon
              name={{
                ios: 'arrow.triangle.2.circlepath.camera',
                android: 'flip_camera_android',
                web: 'flip_camera_android',
              }}
              size={26}
              color="#fff"
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
