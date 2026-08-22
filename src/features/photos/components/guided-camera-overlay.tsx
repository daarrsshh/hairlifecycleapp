import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { PhotoAngle } from '@/features/photos/api';

const GUIDE_LABEL: Record<PhotoAngle, string> = {
  crown: 'Line up the crown, looking straight down',
  hairline: 'Line up your hairline, facing forward',
  left_temple: 'Line up your left temple, head turned right',
  right_temple: 'Line up your right temple, head turned left',
};

type Percent = `${number}%`;

const GUIDE_SHAPE: Record<
  PhotoAngle,
  { top: Percent; left: Percent; width: number; height: number; radius: number }
> = {
  crown: { top: '18%', left: '30%', width: 160, height: 160, radius: 80 },
  hairline: { top: '22%', left: '20%', width: 220, height: 140, radius: 70 },
  left_temple: { top: '25%', left: '15%', width: 150, height: 190, radius: 75 },
  right_temple: { top: '25%', left: '55%', width: 150, height: 190, radius: 75 },
};

/** A simple on-screen outline guide per angle (PRD §5.4) — plain shapes, not silhouette artwork, but enough to keep framing consistent across sessions. */
export function GuidedCameraOverlay({ angle }: { angle: PhotoAngle }) {
  const shape = GUIDE_SHAPE[angle];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.guide,
          {
            top: shape.top,
            left: shape.left,
            width: shape.width,
            height: shape.height,
            borderRadius: shape.radius,
          },
        ]}
      />
      <View style={styles.labelBar}>
        <ThemedText style={styles.label}>{GUIDE_LABEL[angle]}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guide: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderStyle: 'dashed',
  },
  labelBar: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  label: {
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
