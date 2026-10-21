import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text, useToast } from '@/components/ui';
import { VEHICLES } from '@/constants/vehicles';
import { useCreateRide } from '@/features/ride/hooks/useCreateRide';
import { useRideStore } from '@/features/ride/store';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { logger } from '@/lib/logger';
import { makeStyles } from '@/theme';

import { useSelectedEstimate } from '../hooks/useSelectedEstimate';
import { useBookingDraft } from '../store';
import { toEstimateView } from '../utils';

/**
 * "Order Comfort · 8,40 ₼" → POST /api/Rides. On success the ride store starts searching and
 * the route guard opens the ride screen; the draft is cleared. On error the draft is kept.
 */
export function OrderButton() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const toast = useToast();
  const vehicleType = useBookingDraft((s) => s.vehicleType);
  const hasPromo = useBookingDraft((s) => s.promo !== null);
  const selected = useSelectedEstimate();
  const view = selected?.estimate ? toEstimateView(selected.estimate, language) : null;
  const vehicle = t(VEHICLES[vehicleType].labelKey);
  const unavailable = !view && Boolean(selected?.error) && !selected?.isFetching;

  const create = useCreateRide();
  // Until a persisted ride is restored, ordering could overwrite it.
  const rideReady = useRideStore((s) => s.hydrated && s.phase === 'idle');
  // Synchronous guard: a fast double tap must not send two POSTs before re-render.
  const ordering = useRef(false);

  const order = () => {
    const { pickup, destination } = useBookingDraft.getState();
    if (!pickup || !destination || ordering.current || !rideReady) return;
    ordering.current = true;
    logger.info('booking: order', { vehicleType, hasPromo }); // no user data
    create.mutate(
      { pickup, destination, vehicleType },
      {
        onSettled: () => {
          ordering.current = false;
        },
        onSuccess: (created) => {
          // CreateRide has no promo field: the backend decides (docs/BACKEND_REQUESTS.md #14).
          if (hasPromo && !created.promo) {
            toast.show({ message: t('ride.promoNotApplied'), tone: 'warning' });
          }
          useBookingDraft.getState().reset();
        },
        onError: (error) => toast.show({ message: t(error.messageKey), tone: 'danger' }),
      },
    );
  };

  return (
    <View style={styles.wrap}>
      {unavailable ? (
        <Text variant="caption" color="dangerText" align="center" testID="booking-order-hint">
          {t('booking.selectAnother')}
        </Text>
      ) : null}
      <Button
        label={t('booking.order', { vehicle })}
        value={view ? `· ${view.price}` : undefined}
        size="lg"
        fullWidth
        disabled={!view || selected?.isRefreshing || create.isPending || !rideReady}
        loading={create.isPending || !rideReady || (!view && (selected?.isFetching ?? false))}
        haptic="medium"
        onPress={order}
        accessibilityHint={unavailable ? t('booking.selectAnother') : undefined}
        testID="booking-order"
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { gap: t.spacing.sm },
}));
