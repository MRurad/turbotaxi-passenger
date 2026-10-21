import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

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

/** "Where to?" panel: current pickup, the search entry point and recent destinations. */
export function HomeSheetContent({ pinLoading }: HomeSheetContentProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const pickup = useBookingDraft((s) => s.pickup);
  const pickupLocked = useBookingDraft((s) => s.pickupLocked);
  const setDestination = useBookingDraft((s) => s.setDestination);
  const recents = useRecentPlaces((s) => s.places);
  const addRecent = useRecentPlaces((s) => s.add);

  const selectRecent = (place: Place) => {
    setDestination(place);
    addRecent(place).catch(() => undefined);
  };

  return (
    <>
      <PlaceLine
        kind="pickup"
        label={t('common.labels.pickup')}
        value={pickup?.title || t('home.pickupUnknown')}
        // Never show an address the pin has already left (no stale pickup).
        loading={!pickup || (pinLoading && !pickupLocked)}
        loadingLabel={t('home.pickupLoading')}
        testID="home-pickup"
      />
      <WhereToButton
        label={t('home.whereTo')}
        onPress={() => router.push({ pathname: ROUTES.search, params: { field: 'destination' } })}
      />
      {recents.length > 0 ? <RecentPlacesRow places={recents} onSelect={selectRecent} /> : null}
    </>
  );
}
