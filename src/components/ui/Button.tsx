import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme, type ColorToken } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import type { HapticKind, IconName } from './types';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  /** Trailing value that never truncates (e.g. a price); the label shrinks first. */
  value?: string;
  fullWidth?: boolean;
  haptic?: HapticKind;
  /** Defaults to `label` (plus `value`). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const FOREGROUND: Record<ButtonVariant, ColorToken> = {
  primary: 'textOnPrimary',
  secondary: 'primaryText',
  ghost: 'primaryText',
  danger: 'textOnPrimary',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  value,
  fullWidth = false,
  haptic = 'light',
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const styles = useStyles();
  const { colors, sizes } = useTheme();
  const fg = FOREGROUND[variant];
  const inactive = disabled || loading;
  const iconSize = size === 'sm' ? sizes.icon.sm : sizes.icon.md;

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value ? `${label}, ${value}` : label)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        size === 'sm' && variant === 'primary' && styles.smPrimary,
        pressed && styles[`${variant}Pressed`],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.content, loading && styles.hidden]}>
        {leftIcon ? <Ionicons name={leftIcon} size={iconSize} color={colors[fg]} /> : null}
        <Text
          variant="bodyStrong"
          color={fg}
          numberOfLines={1}
          style={[styles.label, size === 'sm' && styles.smLabel]}
        >
          {label}
        </Text>
        {value ? (
          <Text variant="bodyStrong" color={fg} style={styles.value}>
            {value}
          </Text>
        ) : null}
        {rightIcon ? <Ionicons name={rightIcon} size={iconSize} color={colors[fg]} /> : null}
      </View>
      {loading ? (
        <ActivityIndicator
          style={styles.spinner}
          color={colors[fg]}
          testID={testID && `${testID}-spinner`}
        />
      ) : null}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radii.lg,
    paddingHorizontal: t.spacing.xl,
    borderWidth: t.sizes.border,
    borderColor: t.colors.transparent,
  },
  sm: { minHeight: t.sizes.button.sm, paddingHorizontal: t.spacing.lg, borderRadius: t.radii.md },
  md: { minHeight: t.sizes.button.md },
  lg: { minHeight: t.sizes.button.lg, borderRadius: t.radii.lg },
  fullWidth: { alignSelf: 'stretch' },
  primary: { backgroundColor: t.colors.primaryFill, ...t.shadows.sm },
  smPrimary: { backgroundColor: t.colors.primaryFillStrong },
  primaryPressed: { backgroundColor: t.colors.primaryPressed },
  secondary: { backgroundColor: t.colors.primarySoft, borderColor: t.colors.primarySoft },
  secondaryPressed: { borderColor: t.colors.primary },
  ghost: { backgroundColor: t.colors.transparent },
  ghostPressed: { backgroundColor: t.colors.primarySoft },
  danger: { backgroundColor: t.colors.danger },
  dangerPressed: { backgroundColor: t.colors.dangerPressed },
  disabled: { opacity: t.motion.disabledOpacity },
  content: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, maxWidth: '100%' },
  hidden: { opacity: 0 },
  spinner: { position: 'absolute' },
  label: { flexShrink: 1 },
  value: { flexShrink: 0, marginLeft: t.spacing.sm },
  smLabel: { fontSize: t.typography.caption.fontSize, lineHeight: t.typography.caption.lineHeight },
}));
