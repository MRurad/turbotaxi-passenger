import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Skeleton, Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

export interface PlaceLineProps {
  kind: 'pickup' | 'destination';
  label: string;
  /** Address line; ignored while loading. */
  value?: string;
  loading?: boolean;
  /** Announced while loading, e.g. "Finding your address…". */
  loadingLabel?: string;
  /** Trailing action (e.g. clear destination). */
  right?: ReactNode;
  testID?: string;
}

/** "● Pickup / 28 May St 12" line in the home sheet. */
export function PlaceLine({
  kind,
  label,
  value,
  loading = false,
  loadingLabel,
  right,
  testID,
}: PlaceLineProps) {
  const styles = useStyles();
  const { colors, sizes } = useTheme();
  const pickup = kind === 'pickup';

  return (
    <View
      testID={testID}
      style={styles.row}
      accessible
      accessibilityLabel={
        loading ? [label, loadingLabel].filter(Boolean).join(', ') : `${label}: ${value ?? ''}`
      }
      accessibilityState={{ busy: loading }}
    >
      <Ionicons
        name={pickup ? 'radio-button-on' : 'flag'}
        size={sizes.icon.md}
        color={pickup ? colors.primary : colors.danger}
      />
      <View style={styles.text}>
        <Text variant="label" color="textMuted">
          {label}
        </Text>
        {loading ? (
          <Skeleton width="70%" height={sizes.icon.sm} />
        ) : (
          <Text variant="bodyStrong" numberOfLines={1}>
            {value}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  text: { flex: 1, gap: t.spacing.xxs },
}));
