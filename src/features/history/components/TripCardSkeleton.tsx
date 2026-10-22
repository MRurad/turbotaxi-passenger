import { View } from 'react-native';

import { Card, Skeleton } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

/** Placeholder with the trip card's shape while the history loads. */
export function TripCardSkeleton() {
  const styles = useStyles();
  const { sizes } = useTheme();
  return (
    <Card variant="outlined" padding="lg" style={styles.card}>
      <View style={styles.row}>
        <Skeleton width="35%" height={sizes.icon.sm} />
        <Skeleton width="20%" height={sizes.icon.md} radius="pill" />
      </View>
      <Skeleton width="80%" height={sizes.icon.md} />
      <Skeleton width="65%" height={sizes.icon.md} />
      <View style={styles.row}>
        <Skeleton width="40%" height={sizes.icon.sm} />
        <Skeleton width="20%" height={sizes.icon.md} />
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
}));
