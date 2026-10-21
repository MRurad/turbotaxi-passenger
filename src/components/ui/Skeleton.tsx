import { useEffect, useState } from 'react';
import {
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useTheme, type Radii } from '@/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: keyof Radii;
  /** Render a circle of `size` (avatar placeholder). */
  circle?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Placeholder block with a moving highlight band. Hidden from screen readers. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'sm',
  circle,
  style,
  testID,
}: SkeletonProps) {
  const styles = useStyles();
  const { radii, motion } = useTheme();
  const [boxWidth, setBoxWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withRepeat(
        withTiming(1, { duration: motion.shimmerDuration, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [progress, motion.shimmerDuration]);

  const bandStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.get(), [0, 1], [-boxWidth, boxWidth]) }],
    opacity: interpolate(progress.get(), [0, 0.5, 1], [0, 1, 0]),
  }));

  const onLayout = (e: LayoutChangeEvent) => setBoxWidth(e.nativeEvent.layout.width);
  const shape: ViewStyle = circle
    ? { width: circle, height: circle, borderRadius: circle / 2 }
    : { width, height, borderRadius: radii[radius] };

  return (
    <View
      testID={testID}
      onLayout={onLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, shape, style]}
    >
      <Animated.View style={[styles.band, bandStyle]} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: { overflow: 'hidden', backgroundColor: t.colors.skeleton },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '60%',
    backgroundColor: t.colors.skeletonHighlight,
  },
}));
