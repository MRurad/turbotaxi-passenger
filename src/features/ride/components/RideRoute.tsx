import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { PlaceLine } from '@/features/home/components/PlaceLine';
import { makeStyles } from '@/theme';

import { useRideStore } from '../store';

export interface RideRouteProps {
  /** Which ends to show: the trip shows only where it's going. */
  show?: 'both' | 'destination';
}

/** Compact pickup / destination lines of the current ride. */
export function RideRoute({ show = 'both' }: RideRouteProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { pickup, destination } = useRideStore(
    useShallow((s) => ({ pickup: s.pickup, destination: s.destination })),
  );

  return (
    <View style={styles.list} testID="ride-route">
      {show === 'both' ? (
        <PlaceLine
          kind="pickup"
          label={t('common.labels.pickup')}
          value={pickup?.title || t('home.pickupUnknown')}
        />
      ) : null}
      <PlaceLine
        kind="destination"
        label={t('common.labels.destination')}
        value={destination?.title || t('ride.destinationUnknown')}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.spacing.sm },
}));
