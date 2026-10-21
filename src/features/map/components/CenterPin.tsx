import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme';

export interface CenterPinProps {
  /** True while the map is being dragged: the pin lifts and its shadow shrinks. */
  lifted: boolean;
  variant?: 'pickup' | 'destination';
  testID?: string;
}

/**
 * Fixed pin over the map center for choosing a point by dragging the map.
 * Purely visual (pointerEvents none); the screen reads the map center.
 */
export function CenterPin({ lifted, variant = 'pickup', testID }: CenterPinProps) {
  const styles = useStyles();
  const { colors, sizes, motion } = useTheme();
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.set(withSpring(lifted ? 1 : 0, motion.pressSpring));
  }, [lifted, lift, motion.pressSpring]);

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(lift.get(), [0, 1], [0, -sizes.pin.lift]) }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(lift.get(), [0, 1], [1, 0.6]) }],
    opacity: interpolate(lift.get(), [0, 1], [0.35, 0.2]),
  }));

  const color = variant === 'pickup' ? colors.primaryFill : colors.danger;

  return (
    <View
      testID={testID}
      pointerEvents="none"
      style={styles.wrap}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.shadow, shadowStyle]} />
      <Animated.View style={[styles.pin, pinStyle]}>
        <View style={[styles.head, { backgroundColor: color }]}>
          <Ionicons
            name={variant === 'pickup' ? 'person' : 'flag'}
            size={sizes.icon.sm}
            color={colors.textOnPrimary}
          />
        </View>
        <View style={[styles.stem, { backgroundColor: color }]} />
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // The stem's tip sits exactly on the map center.
  wrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    alignItems: 'center',
    marginBottom: t.sizes.pin.head + t.sizes.pin.stem,
  },
  head: {
    width: t.sizes.pin.head,
    height: t.sizes.pin.head,
    borderRadius: t.sizes.pin.head / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: t.sizes.focusBorder * 2,
    borderColor: t.colors.surfaceElevated,
    ...t.shadows.md,
  },
  stem: { width: t.sizes.pin.stemWidth, height: t.sizes.pin.stem, borderRadius: t.radii.sm },
  shadow: {
    position: 'absolute',
    width: t.sizes.pin.shadow,
    height: t.sizes.pin.shadow / 2,
    borderRadius: t.sizes.pin.shadow,
    backgroundColor: t.colors.shadow,
  },
}));
