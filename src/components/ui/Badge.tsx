import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { makeStyles, useTheme, type ColorToken } from '@/theme';

import { Text } from './Text';
import type { IconName, Tone } from './types';

export interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: IconName;
  testID?: string;
}

const FOREGROUND: Record<Tone, ColorToken> = {
  neutral: 'textSecondary',
  primary: 'primaryText',
  success: 'successText',
  warning: 'warningText',
  danger: 'dangerText',
};

export function Badge({ label, tone = 'neutral', icon, testID }: BadgeProps) {
  const styles = useStyles();
  const { colors, sizes } = useTheme();
  const fg = FOREGROUND[tone];

  return (
    <View testID={testID} style={[styles.base, styles[tone]]}>
      {icon ? <Ionicons name={icon} size={sizes.icon.xs} color={colors[fg]} /> : null}
      <Text variant="label" color={fg} numberOfLines={1} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    // Long labels (ru) truncate inside a row instead of pushing siblings out.
    flexShrink: 1,
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radii.pill,
  },
  text: { flexShrink: 1 },
  neutral: {
    backgroundColor: t.colors.surface,
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
  },
  primary: { backgroundColor: t.colors.primarySoft },
  success: { backgroundColor: t.colors.successSoft },
  warning: { backgroundColor: t.colors.warningSoft },
  danger: { backgroundColor: t.colors.dangerSoft },
}));
