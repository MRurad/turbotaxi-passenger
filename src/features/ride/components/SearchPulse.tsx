import { useEffect } from 'react';
import { View } from 'react-native';
import type { Point } from 'react-native-maps';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SEARCH_PULSE_MS } from '@/constants/timeouts';
import { makeStyles, useTheme } from '@/theme';

const START_SCALE = 0.25;
const START_OPACITY = 0.45;
/** With reduced motion: one still ring. */
const STILL_SCALE = 0.6;
const STILL_OPACITY = 0.25;

/**
 * Expanding ring around the pickup while searching. Sits over the map at `point`, where the
 * camera keeps the pickup during the search (map gestures are off then).
 */
export function SearchPulse({ point }: { point: Point }) {
  const styles = useStyles();
  const { sizes } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.set(
      withRepeat(withTiming(1, { duration: SEARCH_PULSE_MS, easing: Easing.out(Easing.quad) }), -1),
    );
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);

  const ring = useAnimatedStyle(() =>
    reduceMotion
      ? { transform: [{ scale: STILL_SCALE }], opacity: STILL_OPACITY }
      : {
          transform: [{ scale: interpolate(progress.get(), [0, 1], [START_SCALE, 1]) }],
          opacity: interpolate(progress.get(), [0, 1], [START_OPACITY, 0]),
        },
  );

  const half = sizes.searchPulse / 2;
  return (
    <View
      pointerEvents="none"
      style={[styles.anchor, { left: point.x - half, top: point.y - half }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.ring, ring]} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  anchor: { position: 'absolute', width: t.sizes.searchPulse, height: t.sizes.searchPulse },
  ring: {
    width: t.sizes.searchPulse,
    height: t.sizes.searchPulse,
    borderRadius: t.radii.pill,
    backgroundColor: t.colors.primary,
  },
}));
