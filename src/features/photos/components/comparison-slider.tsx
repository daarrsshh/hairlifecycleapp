import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { usePhotoZoom } from '@/features/photos/components/use-photo-zoom';

const KNOB_SIZE = 40;

/**
 * Before/after wipe. The left of the divider is `beforeUri`, the right is `afterUri`.
 *
 * Both halves are labelled and the divider carries a knob, because without them this reads as
 * two photos with a hairline through it and nothing suggests the screen is interactive at all.
 *
 * Gestures are separated by pointer count rather than by region: one finger moves the divider,
 * two fingers pinch/pan the photographs. Both images share one zoom transform (`usePhotoZoom`),
 * so they stay in register — independently zoomable images would manufacture differences.
 */
export function ComparisonSlider({
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
  const dividerX = useSharedValue(width / 2);
  const zoom = usePhotoZoom();

  const dividerPan = Gesture.Pan()
    .maxPointers(1)
    .onChange((e) => {
      dividerX.value = Math.min(Math.max(dividerX.value + e.changeX, 0), width);
    });

  const beforeClipStyle = useAnimatedStyle(() => ({ width: dividerX.value }));
  const dividerStyle = useAnimatedStyle(() => ({ left: dividerX.value - 1 }));
  const knobStyle = useAnimatedStyle(() => ({ left: dividerX.value - KNOB_SIZE / 2 }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(dividerPan, zoom.gesture)}>
      <View style={[styles.frame, { width, height }]}>
        <Animated.View style={zoom.style}>
          <Image source={{ uri: afterUri }} style={{ width, height }} contentFit="cover" />
        </Animated.View>

        {/* Clipped to the divider. The inner image carries the same zoom transform as the one
            above, so the two stay aligned at every scale. */}
        <Animated.View style={[styles.beforeClip, beforeClipStyle]}>
          <Animated.View style={zoom.style}>
            <Image source={{ uri: beforeUri }} style={{ width, height }} contentFit="cover" />
          </Animated.View>
        </Animated.View>

        <Animated.View pointerEvents="none" style={[styles.divider, dividerStyle]} />
        <Animated.View pointerEvents="none" style={[styles.knob, knobStyle, { top: height / 2 - KNOB_SIZE / 2 }]}>
          <SymbolView
            name={{ ios: 'arrow.left.and.right', android: 'swap_horiz', web: 'swap_horiz' }}
            size={20}
            tintColor="#1B1A17"
          />
        </Animated.View>

        <View pointerEvents="none" style={[styles.tag, styles.tagLeft]}>
          <Text style={styles.tagText}>{beforeLabel}</Text>
        </View>
        <View pointerEvents="none" style={[styles.tag, styles.tagRight]}>
          <Text style={styles.tagText}>{afterLabel}</Text>
        </View>
      </View>
    </GestureDetector>
  );
}

/* Fixed colors, not theme tokens: everything here sits on photographs rather than on app
   chrome, so it has to hold against dark hair and pale scalp alike in either theme. */
const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: 12, backgroundColor: '#000000' },
  beforeClip: { position: 'absolute', top: 0, left: 0, bottom: 0, overflow: 'hidden' },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.55,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  knob: {
    position: 'absolute',
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 6,
  },
  tag: {
    position: 'absolute',
    top: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagLeft: { left: 10 },
  tagRight: { right: 10 },
  tagText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});
