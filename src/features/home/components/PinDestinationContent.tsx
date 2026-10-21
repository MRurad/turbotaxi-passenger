import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/ui';
import { useBookingDraft } from '@/features/booking/store';
import type { Place } from '@/types/place';

import { useRecentPlaces } from '../recentPlaces';
import { PlaceLine } from './PlaceLine';

export interface PinDestinationContentProps {
  pinnedPlace: Place | null;
  loading: boolean;
}

/** "Choose on map" for the destination: move the map, then confirm the pinned point. */
export function PinDestinationContent({ pinnedPlace, loading }: PinDestinationContentProps) {
  const { t } = useTranslation();
  const setDestination = useBookingDraft((s) => s.setDestination);
  const cancelPinPicking = useBookingDraft((s) => s.cancelPinPicking);
  const addRecent = useRecentPlaces((s) => s.add);
  const ready = !loading && pinnedPlace !== null;

  const confirm = () => {
    if (!pinnedPlace) return;
    setDestination(pinnedPlace);
    addRecent(pinnedPlace).catch(() => undefined);
  };

  return (
    <>
      <Text variant="caption" color="textSecondary">
        {t('search.map.hint')}
      </Text>
      <PlaceLine
        kind="destination"
        label={t('common.labels.destination')}
        value={pinnedPlace?.title || t('home.pickupUnknown')}
        loading={!ready}
        loadingLabel={t('home.pickupLoading')}
      />
      <Button
        label={t('search.map.confirmDestination')}
        size="lg"
        fullWidth
        onPress={confirm}
        disabled={!ready}
        testID="pin-destination-confirm"
      />
      <Button
        label={t('common.actions.cancel')}
        variant="ghost"
        fullWidth
        onPress={cancelPinPicking}
        testID="pin-destination-cancel"
      />
    </>
  );
}
