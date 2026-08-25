import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { usePhotoZoom } from '@/features/photos/components/use-photo-zoom';

const GAP = 4;

/**
 * Both photos in full, side by side.
 *
 * This exists because the slider always hides half of each photo. A wipe is good for showing
 * that something changed; it's poor for judging *how much*, because you can never see two
 * crowns whole at the same moment and let your eye flick between them. That's the actual task
 * here, so it gets its own mode rather than being folded into the slider.
 *
 * One zoom transform drives both panes, so magnification can never differ between them.
 */
export function ComparisonSideBySide({
  beforeUri,
  afterUri,
  beforeLabel,
  afterLabel,
  width,
  height,
}: {
  beforeUri: string;
  afterUri: string;
  beforeLabel: string;
  afterLabel: string;
  width: number;
  height: number;
}) {
  const zoom = usePhotoZoom();
  const paneWidth = (width - GAP) / 2;

  return (
    <GestureDetector gesture={zoom.gesture}>
      <View style={[styles.row, { width, height }]}>
        <Pane uri={beforeUri} label={beforeLabel} width={paneWidth} height={height} zoomStyle={zoom.style} />
        <Pane uri={afterUri} label={afterLabel} width={paneWidth} height={height} zoomStyle={zoom.style} />
      </View>
    </GestureDetector>
  );
}

function Pane({
  uri,
  label,
  width,
  height,
  zoomStyle,
}: {
  uri: string;
  label: string;
  width: number;
  height: number;
  zoomStyle: ReturnType<typeof usePhotoZoom>['style'];
}) {
  return (
    <View style={[styles.pane, { width, height }]}>
      <Animated.View style={zoomStyle}>
        <Image source={{ uri }} style={{ width, height }} contentFit="cover" />
      </Animated.View>
      <View pointerEvents="none" style={styles.tag}>
        <Text style={styles.tagText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP },
  pane: { overflow: 'hidden', borderRadius: 12, backgroundColor: '#000000' },
  tag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
});
