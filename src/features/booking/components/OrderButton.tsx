import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text, useToast } from '@/components/ui';
import { VEHICLES } from '@/constants/vehicles';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { logger } from '@/lib/logger';
import { makeStyles } from '@/theme';

import { useSelectedEstimate } from '../hooks/useSelectedEstimate';
import { useBookingDraft } from '../store';
import { toEstimateView } from '../utils';

/** "Order Comfort · 8,40 ₼". Ride creation arrives in Prompt 9; for now it only logs. */
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

  const order = () => {
    // TODO(Prompt 9): POST /api/Rides → ride store startSearching. Log no user data.
    logger.info('booking: order tapped', { vehicleType, hasPromo });
    toast.show({ message: t('common.labels.comingSoon') });
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
        disabled={!view || selected?.isRefreshing}
        loading={!view && (selected?.isFetching ?? false)}
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
