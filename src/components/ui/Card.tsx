import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { makeStyles, useTheme, type SpacingToken } from '@/theme';

import { PressableScale } from './PressableScale';

export type CardVariant = 'elevated' | 'outlined' | 'soft';

interface CardBaseProps {
  variant?: CardVariant;
  padding?: SpacingToken;
  /** Fade the card in on mount. Not for list rows (recycling flickers). */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Pressable cards always need an a11y label. */
type CardPressProps =
  | { onPress: () => void; accessibilityLabel: string }
  | { onPress?: undefined; accessibilityLabel?: undefined };

export type CardProps = CardBaseProps & CardPressProps;

export function Card({
  variant = 'elevated',
  padding = 'lg',
  onPress,
  accessibilityLabel,
  animated = false,
  style,
  testID,
  children,
}: PropsWithChildren<CardProps>) {
  const styles = useStyles();
  const { spacing, motion } = useTheme();
  const cardStyle = [styles.base, styles[variant], { padding: spacing[padding] }, style];

  const content = onPress ? (
    <PressableScale
      testID={testID}
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={cardStyle}
    >
      {children}
    </PressableScale>
  ) : (
    <View testID={testID} style={cardStyle}>
      {children}
    </View>
  );

  if (!animated) return content;
  return (
    <Animated.View entering={FadeIn.duration(motion.duration.normal)}>{content}</Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  base: { borderRadius: t.radii.xl, overflow: 'visible' },
  elevated: {
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: t.isDark ? t.sizes.border : 0,
    borderColor: t.colors.border,
    ...t.shadows.md,
  },
  outlined: {
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
  },
  soft: { backgroundColor: t.colors.primarySoft },
}));
