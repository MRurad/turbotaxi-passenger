import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';

/** "Today" / "Yesterday" / a date between the messages of different days. */
export function DaySeparator({ label }: { label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <View style={styles.pill}>
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { alignItems: 'center', paddingVertical: t.spacing.md },
  pill: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radii.pill,
    backgroundColor: t.colors.primarySoft,
  },
}));
