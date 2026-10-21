import { useCallback, useState } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { triggerHaptic } from '@/lib/haptics';
import { useTheme } from '@/theme';

import type { HapticKind } from './types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleStyle =
  StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: PressableScaleStyle;
  /** Haptic fired on press. Defaults to none. */
  haptic?: HapticKind;
  /** Disable the scale animation (e.g. for full-width rows). */
  scaleDisabled?: boolean;
}

/** Pressable that scales to 0.97 while pressed — the base of every tappable in the kit. */
export function PressableScale({
  style,
  haptic = 'none',
  scaleDisabled = false,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const { motion } = useTheme();
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(true);
      if (!scaleDisabled) scale.set(withSpring(motion.pressScale, motion.pressSpring));
      onPressIn?.(e);
    },
    [scaleDisabled, scale, motion, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(false);
      scale.set(withSpring(1, motion.pressSpring));
      onPressOut?.(e);
    },
    [scale, motion, onPressOut],
  );

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      triggerHaptic(haptic);
      onPress?.(e);
    },
    [haptic, onPress],
  );

  const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress ? handlePress : undefined}
      style={[resolvedStyle, animatedStyle]}
    />
  );
}
