import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';
import { formatElapsed } from '@/lib/format';

import { useElapsedSeconds } from '../hooks/useElapsedSeconds';
import { useRideStore } from '../store';
import { RideCancelButton } from './RideCancelButton';
import { RideFareRow } from './RideFareRow';
import { RideRoute } from './RideRoute';

/**
 * "Looking for a driver…", elapsed time, the route, class + price, Cancel. After a driver
 * dropped out, a notice says why we're searching again.
 */
export function SearchingContent() {
  const styles = useStyles();
  const { t } = useTranslation();
  const startedAt = useRideStore((s) => s.searchStartedAt);
  const driverDropped = useRideStore((s) => s.driverDropped);
  const elapsed = useElapsedSeconds(startedAt);

  return (
    <>
      {driverDropped ? (
        <View style={styles.notice} testID="ride-driver-dropped">
          <Text variant="caption" color="warningText">
            {t('ride.searching.driverDropped')}
          </Text>
        </View>
      ) : null}
      <Text variant="heading" accessibilityRole="header">
        {t('ride.searching.title')}
      </Text>
      <Text variant="body" color="textSecondary">
        {t('ride.searching.subtitle')}
      </Text>
      <Text variant="caption" color="textMuted" style={styles.timer} testID="ride-elapsed">
        {t('ride.searching.elapsed', { time: formatElapsed(elapsed) })}
      </Text>
      <RideRoute />
      <RideFareRow />
      <RideCancelButton />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  notice: {
    padding: t.spacing.md,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.warningSoft,
  },
  // Equal-width digits: the running timer doesn't jitter.
  timer: { fontVariant: ['tabular-nums'] },
}));
