import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

/**
 * Pinch-to-zoom shared by both comparison modes.
 *
 * Density changes over three months are subtle, and at phone size a real difference can be
 * smaller than the thing you're looking through. Zoom is what makes it legible.
 *
 * The returned style is applied to **every** image in a comparison, so they scale and translate
 * as one — zooming one photo independently of the other would let you "find" a difference that
 * is really just a difference in magnification.
 *
 * Pointer counts keep this from fighting the slider's divider drag: panning here needs two
 * fingers, so one-finger drags stay available for the divider. Double-tap resets.
 */
export function usePhotoZoom() {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, MIN_SCALE), MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // Snapping home at 1x stops the image drifting off-centre after a zoom out.
      if (scale.value <= MIN_SCALE) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  const twoFingerPan = Gesture.Pan()
    .minPointers(2)
    .onChange((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
    });

  const doubleTapReset = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withTiming(MIN_SCALE);
      savedScale.value = MIN_SCALE;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
    });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return {
    /** Compose into the host's gesture tree. */
    gesture: Gesture.Simultaneous(pinch, twoFingerPan, doubleTapReset),
    style,
  };
}
