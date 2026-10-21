import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Divider, IconButton, Text, type SheetRef } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import type { UserPromo } from '@/features/promo/types';
import { makeStyles, useTheme } from '@/theme';

import { useBackToWhereTo } from '../hooks/useBackToWhereTo';
import { getPromoStatus } from '../promoStatus';
import { useRouteEstimates } from '../hooks/useRouteEstimates';
import { useBookingDraft } from '../store';
import { PaymentRow } from './PaymentRow';
import { PromoRow } from './PromoRow';
import { PromoSheet } from './PromoSheet';
import { RouteSummary } from './RouteSummary';
import { VehicleList } from './VehicleList';

/** Booking panel once pickup + destination are set: route, vehicles, promo, payment. */
export function BookingSheetContent() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { motion } = useTheme();
  const promoSheet = useRef<SheetRef>(null);
  const [promoSheetUsed, setPromoSheetUsed] = useState(false);
  const pickup = useBookingDraft((s) => s.pickup);
  const destination = useBookingDraft((s) => s.destination);
  const promo = useBookingDraft((s) => s.promo);
  const setPromo = useBookingDraft((s) => s.setPromo);
  const clearDestination = useBookingDraft((s) => s.clearDestination);
  const estimates = useRouteEstimates();

  useBackToWhereTo(clearDestination);

  const pickPromo = useCallback(
    (selected: UserPromo | null) => {
      setPromo(selected);
      promoSheet.current?.dismiss();
    },
    [setPromo],
  );

  if (!destination) return null;

  const editSearch = (field: 'pickup' | 'destination') =>
    router.push({ pathname: ROUTES.search, params: { field } });
  const openPromos = () => {
    setPromoSheetUsed(true);
    promoSheet.current?.present();
  };

  return (
    <Animated.View entering={FadeIn.duration(motion.duration.normal)} style={styles.content}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-back"
          variant="ghost"
          onPress={clearDestination}
          accessibilityLabel={t('common.a11y.back')}
          testID="booking-back"
        />
        <Text variant="heading" accessibilityRole="header" style={styles.title}>
          {t('booking.title')}
        </Text>
      </View>
      <RouteSummary
        pickup={pickup}
        destination={destination}
        onEditPickup={() => editSearch('pickup')}
        onEditDestination={() => editSearch('destination')}
      />
      <VehicleList estimates={estimates} />
      <View>
        <PromoRow
          promo={promo}
          status={getPromoStatus(promo !== null, estimates)}
          onOpen={openPromos}
          onRemove={() => setPromo(null)}
        />
        <Divider spacing="xxs" />
        <PaymentRow />
      </View>
      <PromoSheet
        ref={promoSheet}
        active={promoSheetUsed}
        selectedId={promo?.id ?? null}
        onSelect={pickPromo}
      />
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: t.spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    marginLeft: -t.spacing.sm,
  },
  title: { flex: 1 },
}));
