import { Image } from 'expo-image';
import { Icon } from '@/components/icon';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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

  /* Named handlers rather than inline arrows: assigning to a shared value inside JSX trips
     react-hooks/immutability, which can't tell a Reanimated write from a render-time mutation. */
  function showBeforeInFull() {
    dividerX.value = withTiming(width);
  }
  function showAfterInFull() {
    dividerX.value = withTiming(0);
  }

  const beforeClipStyle = useAnimatedStyle(() => ({ width: dividerX.value }));
  const dividerStyle = useAnimatedStyle(() => ({ left: dividerX.value - 1 }));
  const knobStyle = useAnimatedStyle(() => ({ left: dividerX.value - KNOB_SIZE / 2 }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(dividerPan, zoom.gesture)}>
      <View
        style={[styles.frame, { width, height }]}
        accessibilityLabel={`Comparison between ${beforeLabel} and ${afterLabel}. Drag to wipe between them, or tap a label to see one in full.`}>
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
          <Icon
            name={{ ios: 'arrow.left.and.right', android: 'swap_horiz', web: 'swap_horiz' }}
            size={20}
            color="#1B1A17"
          />
        </Animated.View>

        {/* Tappable, not decorative. The divider is drag-only, which left before/after
            comparison unusable without a precise gesture — for a screen reader, a tremor, or
            just one-handed. Tapping a tag jumps the divider to that end, which is what most
            people want from the control anyway. */}
        <Pressable
          onPress={showBeforeInFull}
          style={[styles.tag, styles.tagLeft]}
          accessibilityRole="button"
          accessibilityLabel={`Show ${beforeLabel} photo in full`}>
          <Text style={styles.tagText}>{beforeLabel}</Text>
        </Pressable>
        <Pressable
          onPress={showAfterInFull}
          style={[styles.tag, styles.tagRight]}
          accessibilityRole="button"
          accessibilityLabel={`Show ${afterLabel} photo in full`}>
          <Text style={styles.tagText}>{afterLabel}</Text>
        </Pressable>
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
