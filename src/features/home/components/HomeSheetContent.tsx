import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, IconButton } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useBookingDraft } from '@/features/booking/store';
import type { Place } from '@/types/place';

import { useRecentPlaces } from '../recentPlaces';
import { PlaceLine } from './PlaceLine';
import { RecentPlacesRow } from './RecentPlacesRow';
import { WhereToButton } from './WhereToButton';

export interface HomeSheetContentProps {
  /** The center pin's address is being resolved (only matters while it drives the pickup). */
  pinLoading: boolean;
}

/** Default home panel: pickup, "Where to?" or the chosen destination, and recent places. */
export function HomeSheetContent({ pinLoading }: HomeSheetContentProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const pickup = useBookingDraft((s) => s.pickup);
  const pickupLocked = useBookingDraft((s) => s.pickupLocked);
  const destination = useBookingDraft((s) => s.destination);
  const setDestination = useBookingDraft((s) => s.setDestination);
  const clearDestination = useBookingDraft((s) => s.clearDestination);
  const recents = useRecentPlaces((s) => s.places);
  const addRecent = useRecentPlaces((s) => s.add);
  const unnamed = t('home.pickupUnknown');

  const selectRecent = (place: Place) => {
    setDestination(place);
    addRecent(place).catch(() => undefined);
  };

  return (
    <>
      <PlaceLine
        kind="pickup"
        label={t('common.labels.pickup')}
        value={pickup?.title || unnamed}
        // Never show an address the pin has already left (no stale pickup).
        loading={!pickup || (pinLoading && !pickupLocked)}
        loadingLabel={t('home.pickupLoading')}
        testID="home-pickup"
      />
      {destination ? (
        <>
          <PlaceLine
            kind="destination"
            label={t('common.labels.destination')}
            value={destination.title || unnamed}
            testID="home-destination"
            right={
              <IconButton
                icon="close"
                variant="ghost"
                onPress={clearDestination}
                accessibilityLabel={t('booking.clearDestination')}
                testID="home-clear-destination"
              />
            }
          />
          {/* Vehicle selection + price arrive in Prompt 7. */}
          <Button
            label={t('booking.title')}
            size="lg"
            fullWidth
            disabled
            onPress={() => undefined}
          />
        </>
      ) : (
        <>
          <WhereToButton label={t('home.whereTo')} onPress={() => router.push(ROUTES.search)} />
          {recents.length > 0 ? <RecentPlacesRow places={recents} onSelect={selectRecent} /> : null}
        </>
      )}
    </>
  );
}
