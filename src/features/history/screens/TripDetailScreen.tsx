import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, Card, Divider, EmptyState, ErrorState, Header, Screen } from '@/components/ui';
import { VEHICLES, vehicleTypeFromName } from '@/constants/vehicles';
import { PlaceLine } from '@/features/home/components/PlaceLine';
import { SummaryRow } from '@/features/ride/components/SummaryRow';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatDate, formatMoney } from '@/lib/format';
import { makeStyles } from '@/theme';

import { TripCardSkeleton } from '../components/TripCardSkeleton';
import { useTripHistory } from '../hooks/useTripHistory';
import { useTripPlaceName } from '../hooks/useTripPlaceName';
import { driverName, tripStatusTone, vehicleLine } from '../utils';

const ADDRESS_LINES = 3;

/**
 * Every field of one trip: status, date, route, fare breakdown, driver and car. There is no
 * GET trip endpoint, so it reads the history (paging on until the trip turns up).
 */
export function TripDetailScreen({ rideId }: { rideId: number }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const history = useTripHistory();
  const trip = history.trips.find((item) => item.rideId === rideId) ?? null;
  const pickup = useTripPlaceName(trip?.pickupAddress ?? null, trip?.pickupPoint ?? null);
  const destination = useTripPlaceName(
    trip?.destinationAddress ?? null,
    trip?.destinationPoint ?? null,
  );
  const searching = !trip && history.hasMore && !history.error;
  const { loadMore } = history;

  useEffect(() => {
    if (searching) loadMore();
  }, [searching, loadMore]);

  const header = (
    <Header
      title={t('history.detail.title')}
      onBack={() => router.back()}
      backLabel={t('common.a11y.back')}
    />
  );
  if (!trip && (history.isLoading || searching)) {
    return (
      <Screen header={header} contentStyle={styles.content}>
        <TripCardSkeleton />
      </Screen>
    );
  }
  if (!trip && (history.error || history.isOffline)) {
    return (
      <Screen header={header}>
        <ErrorState
          title={t('history.loadError')}
          message={history.error ? t(history.error.messageKey) : t('errors.network')}
          retryLabel={t('common.actions.retry')}
          onRetry={history.refetch}
        />
      </Screen>
    );
  }
  if (!trip) {
    return (
      <Screen header={header}>
        <EmptyState
          icon="document-text-outline"
          title={t('history.detail.notFound')}
          actionLabel={t('common.actions.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const driver = driverName(trip.driver);
  const vehicleType = vehicleTypeFromName(trip.vehicle?.type);
  const vehicle =
    vehicleLine(trip.vehicle) ?? (vehicleType !== null ? t(VEHICLES[vehicleType].labelKey) : null);

  return (
    <Screen scroll header={header} contentStyle={styles.content} testID="trip-detail">
      <Badge label={t(`ride.status.${trip.status}`)} tone={tripStatusTone(trip.status)} />
      <Card variant="outlined" padding="lg" style={styles.card}>
        {trip.date ? (
          <SummaryRow label={t('history.detail.date')} value={formatDate(trip.date, language)} />
        ) : null}
        <PlaceLine
          kind="pickup"
          label={t('common.labels.pickup')}
          value={pickup.name}
          loading={pickup.loading}
          loadingLabel={t('common.labels.loading')}
          numberOfLines={ADDRESS_LINES}
        />
        <PlaceLine
          kind="destination"
          label={t('common.labels.destination')}
          value={destination.name}
          loading={destination.loading}
          loadingLabel={t('common.labels.loading')}
          numberOfLines={ADDRESS_LINES}
        />
      </Card>
      <Card variant="outlined" padding="lg" style={styles.card}>
        {trip.hasDiscount ? (
          <>
            <SummaryRow
              label={t('ride.completed.originalPrice')}
              value={formatMoney(trip.fare, language)}
            />
            <SummaryRow
              label={t('ride.completed.discount')}
              value={t('ride.completed.discountValue', {
                amount: formatMoney(trip.discountAmount, language),
              })}
            />
            <Divider />
          </>
        ) : null}
        <SummaryRow
          label={t('ride.completed.fare')}
          value={formatMoney(trip.finalFare, language)}
          strong
        />
      </Card>
      {driver || vehicle ? (
        <Card variant="outlined" padding="lg" style={styles.card}>
          {driver ? <SummaryRow label={t('history.detail.driver')} value={driver} /> : null}
          {vehicle ? <SummaryRow label={t('history.detail.vehicle')} value={vehicle} /> : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: t.spacing.lg },
  card: { gap: t.spacing.sm },
}));
