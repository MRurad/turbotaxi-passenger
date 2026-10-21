import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import type { IconName } from './types';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Ionicon shown in a soft circle. Ignored when `left` is provided. */
  icon?: IconName;
  /** Custom leading element (e.g. <Avatar />). */
  left?: ReactNode;
  /** Trailing text (price, date…). */
  value?: string;
  /** Custom trailing element; replaces `value`/chevron. */
  right?: ReactNode;
  /** Defaults to true when `onPress` is set. */
  showChevron?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function ListItem({
  title,
  subtitle,
  icon,
  left,
  value,
  right,
  showChevron,
  onPress,
  accessibilityLabel,
  testID,
}: ListItemProps) {
  const styles = useStyles();
  const { colors, sizes } = useTheme();
  const chevron = showChevron ?? Boolean(onPress);

  const leading =
    left ??
    (icon ? (
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={sizes.icon.md} color={colors.primary} />
      </View>
    ) : null);

  const label = accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ');
  const content = (
    <>
      {leading}
      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ??
        (value ? (
          <Text variant="bodyStrong" color="textSecondary" style={styles.value}>
            {value}
          </Text>
        ) : null)}
      {chevron && !right ? (
        <Ionicons name="chevron-forward" size={sizes.icon.md} color={colors.textMuted} />
      ) : null}
    </>
  );

  // Static rows stay a plain View so screen readers don't announce them as "dimmed".
  if (!onPress) {
    return (
      <View testID={testID} accessible accessibilityLabel={label} style={styles.row}>
        {content}
      </View>
    );
  }

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.sizes.touchTarget + t.spacing.lg,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
    borderRadius: t.radii.md,
  },
  pressed: { backgroundColor: t.colors.pressedOverlay },
  value: { flexShrink: 0 },
  iconWrap: {
    width: t.sizes.avatar.md,
    height: t.sizes.avatar.md,
    borderRadius: t.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
  },
  body: { flex: 1, gap: t.spacing.xxs },
}));
