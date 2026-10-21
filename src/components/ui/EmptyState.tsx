import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { makeStyles, useTheme, type ColorToken } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';
import type { IconName } from './types';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Icon tint; ErrorState uses danger. */
  tone?: 'primary' | 'danger';
  testID?: string;
}

const TINT: Record<NonNullable<EmptyStateProps['tone']>, { fg: ColorToken; bg: ColorToken }> = {
  primary: { fg: 'primary', bg: 'primarySoft' },
  danger: { fg: 'danger', bg: 'dangerSoft' },
};

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'primary',
  testID,
}: EmptyStateProps) {
  const styles = useStyles();
  const { colors, sizes, motion } = useTheme();
  const tint = TINT[tone];

  return (
    <Animated.View
      testID={testID}
      entering={FadeInDown.duration(motion.duration.slow)}
      style={styles.container}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors[tint.bg] }]}>
        <Ionicons name={icon} size={sizes.icon.xl} color={colors[tint.fg]} />
      </View>
      <Text variant="heading" align="center" accessibilityRole="header">
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textSecondary" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={styles.action}
          testID={testID && `${testID}-action`}
        />
      ) : null}
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.xl,
    paddingVertical: t.spacing.xxxl,
  },
  iconWrap: {
    width: t.sizes.emptyIcon,
    height: t.sizes.emptyIcon,
    borderRadius: t.sizes.emptyIcon / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: t.spacing.md,
  },
  message: { maxWidth: t.sizes.dialogMaxWidth },
  action: { marginTop: t.spacing.lg },
}));
