import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

export function ComparisonSlider({
  beforeUri,
  afterUri,
  width,
  height,
}: {
  beforeUri: string;
  afterUri: string;
  width: number;
  height: number;
}) {
  const dividerX = useSharedValue(width / 2);

  const pan = Gesture.Pan().onChange((e) => {
    dividerX.value = Math.min(Math.max(dividerX.value + e.changeX, 0), width);
  });

  const beforeClipStyle = useAnimatedStyle(() => ({ width: dividerX.value }));
  const handleStyle = useAnimatedStyle(() => ({ left: dividerX.value - 1 }));

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width, height }}>
        <Image source={{ uri: afterUri }} style={{ width, height }} contentFit="cover" />
        <Animated.View style={[styles.beforeClip, beforeClipStyle]}>
          <Image source={{ uri: beforeUri }} style={{ width, height }} contentFit="cover" />
        </Animated.View>
        <Animated.View style={[styles.handle, handleStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  beforeClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  /* Fixed white with a shadow, not a theme token. This line sits on photographs, not on app
     chrome, so it has to stay visible against dark hair and pale scalp alike — a theme color
     tracks the *app's* background and goes invisible on half of them. */
  handle: {
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
});
