import Ionicons from '@expo/vector-icons/Ionicons';
import type { StyleProp, ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import type { IconName } from './types';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
  /** Use 'radio' inside single-select groups (container gets role="radiogroup"). */
  role?: 'button' | 'radio';
  /** Defaults to label; set when the label is an abbreviation (e.g. "AZ"). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
  role = 'button',
  accessibilityLabel,
  style,
  testID,
}: ChipProps) {
  const styles = useStyles();
  const { colors, sizes } = useTheme();
  const fg = selected ? 'textOnPrimary' : 'textPrimary';

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled || !onPress}
      haptic="selection"
      hitSlop={sizes.chipHitSlop}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={
        role === 'radio' ? { checked: selected, disabled } : { selected, disabled }
      }
      style={[styles.base, selected && styles.selected, disabled && styles.disabled, style]}
    >
      {icon ? <Ionicons name={icon} size={sizes.icon.sm} color={colors[fg]} /> : null}
      <Text variant="caption" color={fg} numberOfLines={1} style={styles.label}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    minHeight: t.sizes.chipHeight,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radii.pill,
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surfaceElevated,
  },
  selected: {
    backgroundColor: t.colors.primaryFillStrong,
    borderColor: t.colors.primaryFillStrong,
  },
  disabled: { opacity: t.motion.disabledOpacity },
  label: { fontFamily: t.typography.bodyStrong.fontFamily },
}));
