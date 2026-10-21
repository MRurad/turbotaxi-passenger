import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { Button, Card, Divider, EmptyState, Screen } from '@/components/ui';
import { useBackToWhereTo } from '@/features/booking/hooks/useBackToWhereTo';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatDistance, formatDuration, formatMoney } from '@/lib/format';

import { SummaryRow } from '../components/SummaryRow';
import { useRideStore } from '../store';

/** Completed ride as a receipt: original, discount, promo, total; distance, duration → Done. */
export function RideSummaryScreen() {
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const { fare, tripKm, tripMinutes, reset } = useRideStore(
    useShallow((s) => ({
      fare: s.fare,
      tripKm: s.tripKm,
      tripMinutes: s.tripMinutes,
      reset: s.reset,
    })),
  );
  // Android back = Done (otherwise the route guard would just bounce back here).
  useBackToWhereTo(reset);

  const total = fare ? (fare.final ?? fare.estimated) : null;
  const hasDiscount = fare !== null && fare.discount > 0;
  const hasTrip = tripKm !== null || tripMinutes !== null;

  return (
    <Screen
      scroll
      footer={
        <Button
          label={t('ride.completed.done')}
          size="lg"
          fullWidth
          haptic="light"
          onPress={reset}
          testID="ride-done"
        />
      }
      testID="ride-summary"
    >
      <EmptyState icon="checkmark-circle" title={t('ride.completed.title')} />
      {total !== null || hasTrip ? (
        <Card variant="outlined" padding="lg">
          {hasDiscount ? (
            <>
              <SummaryRow
                label={t('ride.completed.originalPrice')}
                value={formatMoney(fare.original, language)}
              />
              <SummaryRow
                label={t('ride.completed.discount')}
                value={t('ride.completed.discountValue', {
                  amount: formatMoney(fare.discount, language),
                })}
              />
            </>
          ) : null}
          {fare?.promoCode ? (
            <SummaryRow label={t('ride.completed.promo')} value={fare.promoCode} />
          ) : null}
          {total !== null ? (
            <>
              {hasDiscount || fare?.promoCode ? <Divider /> : null}
              <SummaryRow
                label={t('ride.completed.fare')}
                value={formatMoney(total, language)}
                strong
                testID="ride-summary-total"
              />
            </>
          ) : null}
          {hasTrip ? <Divider /> : null}
          {tripKm !== null ? (
            <SummaryRow
              label={t('common.labels.distance')}
              value={formatDistance(tripKm, language)}
            />
          ) : null}
          {tripMinutes !== null ? (
            <SummaryRow
              label={t('common.labels.duration')}
              value={formatDuration(tripMinutes, language)}
            />
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
