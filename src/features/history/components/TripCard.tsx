import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, Card, Skeleton, Text } from '@/components/ui';
import { VEHICLES, vehicleTypeFromName } from '@/constants/vehicles';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatDate, formatMoney } from '@/lib/format';
import { makeStyles, useTheme } from '@/theme';

import { useTripPlaceName } from '../hooks/useTripPlaceName';
import type { Trip } from '../types';
import { tripStatusTone, vehicleLine } from '../utils';

export interface TripCardProps {
  trip: Trip;
  onPress: (rideId: number) => void;
}

/** Date + status, pickup → destination, car, and what was paid (struck original if discounted). */
export const TripCard = memo(function TripCard({ trip, onPress }: TripCardProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const { colors, sizes } = useTheme();
  const date = trip.date ? formatDate(trip.date, language) : '';
  const pickup = useTripPlaceName(trip.pickupAddress, trip.pickupPoint);
  const destination = useTripPlaceName(trip.destinationAddress, trip.destinationPoint);
  const from = pickup.name;
  const to = destination.name;
  const price = formatMoney(trip.finalFare, language);
  const status = t(`ride.status.${trip.status}`);
  const vehicleType = vehicleTypeFromName(trip.vehicle?.type);
  // Car details, else the translated class (never the raw backend string).
  const vehicle =
    vehicleLine(trip.vehicle) ?? (vehicleType !== null ? t(VEHICLES[vehicleType].labelKey) : null);

  return (
    <Card
      variant="outlined"
      padding="lg"
      onPress={() => onPress(trip.rideId)}
      accessibilityLabel={t('history.a11yCard', { date, from, to, price, status })}
      style={styles.card}
      testID={`trip-${trip.rideId}`}
    >
      <View style={styles.header}>
        <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.date}>
          {date}
        </Text>
        <Badge label={status} tone={tripStatusTone(trip.status)} />
      </View>
      <View style={styles.route}>
        <View style={styles.stop}>
          <Ionicons name="radio-button-on" size={sizes.icon.sm} color={colors.primary} />
          {pickup.loading ? (
            <Skeleton width="60%" height={sizes.icon.sm} />
          ) : (
            <Text variant="body" numberOfLines={1} style={styles.address}>
              {from}
            </Text>
          )}
        </View>
        <View style={styles.stop}>
          <Ionicons name="flag" size={sizes.icon.sm} color={colors.danger} />
          {destination.loading ? (
            <Skeleton width="60%" height={sizes.icon.sm} />
          ) : (
            <Text variant="body" numberOfLines={1} style={styles.address}>
              {to}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.footer}>
        <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.vehicle}>
          {vehicle ?? ''}
        </Text>
        {trip.hasDiscount ? (
          <Text variant="caption" color="textMuted" style={styles.struck}>
            {formatMoney(trip.fare, language)}
          </Text>
        ) : null}
        <Text variant="bodyStrong">{price}</Text>
      </View>
    </Card>
  );
});

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  date: { flex: 1 },
  route: { gap: t.spacing.xs },
  stop: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  address: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'baseline', gap: t.spacing.sm },
  vehicle: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
}));
