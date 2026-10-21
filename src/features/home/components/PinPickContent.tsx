import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Text } from '@/components/ui';
import { useBackToWhereTo } from '@/features/booking/hooks/useBackToWhereTo';
import { useBookingDraft, type PinTarget } from '@/features/booking/store';
import { distanceMeters } from '@/lib/geo';
import { triggerHaptic } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme';
import type { Place } from '@/types/place';

import { useRecentPlaces } from '../recentPlaces';
import { PlaceLine } from './PlaceLine';

/** A pin left (almost) where it started is "no change": keep the original, better-named place. */
const UNCHANGED_PIN_RADIUS_M = 5;

export interface PinPickContentProps {
  target: PinTarget;
  pinnedPlace: Place | null;
  loading: boolean;
}

/** "Choose on map" for the pickup or the destination: move the map, then confirm the pin. */
export function PinPickContent({ target, pinnedPlace, loading }: PinPickContentProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { motion } = useTheme();
  const current = useBookingDraft((s) => (target === 'pickup' ? s.pickup : s.destination));
  const other = useBookingDraft((s) => (target === 'pickup' ? s.destination : s.pickup));
  const setPickup = useBookingDraft((s) => s.setPickup);
  const setDestination = useBookingDraft((s) => s.setDestination);
  const cancelPinPicking = useBookingDraft((s) => s.cancelPinPicking);
  const addRecent = useRecentPlaces((s) => s.add);
  const ready = !loading && pinnedPlace !== null;
  const isPickup = target === 'pickup';
  const otherKind: PinTarget = isPickup ? 'destination' : 'pickup';

  // Android back = Cancel (the booking sheet's handler is unmounted in this mode).
  useBackToWhereTo(cancelPinPicking);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(t('search.map.hint'));
  }, [t]);

  const confirm = () => {
    if (!pinnedPlace) return;
    if (
      current &&
      distanceMeters(current.location, pinnedPlace.location) <= UNCHANGED_PIN_RADIUS_M
    ) {
      cancelPinPicking();
      return;
    }
    triggerHaptic('success');
    if (isPickup) {
      setPickup(pinnedPlace);
      return;
    }
    setDestination(pinnedPlace);
    addRecent(pinnedPlace).catch(() => undefined);
  };

  return (
    <Animated.View entering={FadeIn.duration(motion.duration.normal)} style={styles.content}>
      <Text variant="caption" color="textSecondary" accessibilityRole="header">
        {t('search.map.hint')}
      </Text>
      <PlaceLine
        kind={target}
        label={t(isPickup ? 'common.labels.pickup' : 'common.labels.destination')}
        value={pinnedPlace?.title || t('home.pickupUnknown')}
        loading={!ready}
        loadingLabel={t('search.map.loading')}
      />
      {other ? (
        <PlaceLine
          kind={otherKind}
          label={t(isPickup ? 'common.labels.destination' : 'common.labels.pickup')}
          value={other.title || t('home.pickupUnknown')}
        />
      ) : null}
      <Button
        label={t(isPickup ? 'search.map.confirmPickup' : 'search.map.confirmDestination')}
        size="lg"
        fullWidth
        onPress={confirm}
        disabled={!ready}
        loading={!ready}
        testID={`pin-${target}-confirm`}
      />
      <Button
        label={t('common.actions.cancel')}
        variant="ghost"
        fullWidth
        onPress={cancelPinPicking}
        testID={`pin-${target}-cancel`}
      />
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: t.spacing.lg },
}));
