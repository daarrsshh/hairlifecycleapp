import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

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
  const theme = useTheme();
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
        <Animated.View style={[styles.handle, handleStyle, { backgroundColor: theme.onPrimary }]} />
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
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
  },
});
