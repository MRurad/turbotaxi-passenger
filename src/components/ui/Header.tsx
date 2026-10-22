import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

interface HeaderBaseProps {
  /** Omit for a bare back bar (the screen renders its own large title). */
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  /** Large title (screen landing) vs compact centered title (pushed screen). */
  large?: boolean;
  testID?: string;
}

/** A back button always needs its own a11y label. */
type HeaderBackProps =
  { onBack: () => void; backLabel: string } | { onBack?: undefined; backLabel?: undefined };

export type HeaderProps = HeaderBaseProps & HeaderBackProps;

export function Header({
  title,
  subtitle,
  onBack,
  backLabel,
  right,
  large = false,
  testID,
}: HeaderProps) {
  const styles = useStyles();

  return (
    <View testID={testID} style={styles.container}>
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <IconButton
              icon="chevron-back"
              variant="ghost"
              onPress={onBack}
              accessibilityLabel={backLabel}
              testID={testID && `${testID}-back`}
            />
          ) : null}
        </View>
        {large || !title ? (
          <View style={styles.title} />
        ) : (
          <View style={styles.title} accessible accessibilityRole="header">
            <Text variant="heading" numberOfLines={1} align="center">
              {title}
            </Text>
            {/* Compact header: the subtitle is one caption line under the title. */}
            {subtitle ? (
              <Text variant="caption" color="textSecondary" numberOfLines={1} align="center">
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}
        <View style={[styles.side, styles.right]}>{right}</View>
      </View>
      {large ? (
        <View style={styles.large}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" color="textSecondary">
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: t.sizes.touchTarget + t.spacing.sm,
  },
  side: { minWidth: t.sizes.touchTarget, flexDirection: 'row' },
  right: { justifyContent: 'flex-end' },
  title: { flex: 1 },
  large: { paddingHorizontal: t.spacing.sm, gap: t.spacing.xs, paddingTop: t.spacing.xs },
}));
