import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';

export interface SummaryRowProps {
  label: string;
  value: string;
  /** The total: larger, bold. */
  strong?: boolean;
  testID?: string;
}

/** "Label ………… value" line of the trip summary. */
export function SummaryRow({ label, value, strong = false, testID }: SummaryRowProps) {
  const styles = useStyles();
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`} testID={testID}>
      <Text
        variant={strong ? 'bodyStrong' : 'body'}
        color={strong ? 'textPrimary' : 'textSecondary'}
        style={styles.label}
      >
        {label}
      </Text>
      <Text variant={strong ? 'title' : 'bodyStrong'} align="right" style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.md,
    paddingVertical: t.spacing.xs,
  },
  label: { flexShrink: 1 },
  // Long values (a car + plate, a driver's name) wrap instead of overflowing.
  value: { flexShrink: 1 },
}));
