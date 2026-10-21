import Ionicons from '@expo/vector-icons/Ionicons';
import type { StyleProp, ViewStyle } from 'react-native';

import { makeStyles, useTheme, type ColorToken } from '@/theme';

import { PressableScale } from './PressableScale';
import type { HapticKind, IconName } from './types';

export type IconButtonVariant = 'filled' | 'soft' | 'ghost' | 'surface';
export type IconButtonSize = 'md' | 'lg';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  /** Required: icon-only buttons have no visible text. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  haptic?: HapticKind;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const ICON_COLOR: Record<IconButtonVariant, ColorToken> = {
  filled: 'textOnPrimary',
  soft: 'primary',
  ghost: 'textPrimary',
  surface: 'textPrimary',
};

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'soft',
  size = 'md',
  disabled = false,
  haptic = 'light',
  style,
  testID,
}: IconButtonProps) {
  const styles = useStyles();
  const { colors, sizes } = useTheme();

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={size === 'lg' ? sizes.icon.lg : sizes.icon.md}
        color={colors[ICON_COLOR[variant]]}
      />
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: t.radii.pill },
  md: { width: t.sizes.touchTarget, height: t.sizes.touchTarget },
  lg: { width: t.sizes.button.lg, height: t.sizes.button.lg },
  filled: { backgroundColor: t.colors.primaryFill },
  soft: { backgroundColor: t.colors.primarySoft },
  ghost: { backgroundColor: t.colors.transparent },
  surface: {
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
    ...t.shadows.md,
  },
  pressed: { opacity: t.motion.pressedOpacity },
  disabled: { opacity: t.motion.disabledOpacity },
}));
