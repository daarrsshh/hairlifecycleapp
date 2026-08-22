import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
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
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <GuidedCameraOverlay angle={angle} />

      <View style={styles.topBar}>
        <Pressable onPress={onCancel}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </Pressable>
        <Pressable onPress={onPickFromLibrary}>
          <ThemedText style={styles.cancelText}>Choose from library</ThemedText>
        </Pressable>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={capture} style={styles.shutterOuter}>
          <View style={styles.shutterInner} />
        </Pressable>
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
    alignItems: 'center',
  },
  cancelText: { color: '#fff' },
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
