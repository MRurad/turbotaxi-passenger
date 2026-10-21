import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useShallow } from 'zustand/react/shallow';

import { useToast } from '@/components/ui';
import { useBookingDraft } from '@/features/booking/store';
import type { Place, PlaceSuggestion } from '@/types/place';

import type { SearchField } from '../components/SearchFields';
import { useRecentPlaces } from '../recentPlaces';
import { usePlacesAutocomplete } from './usePlacesAutocomplete';
import { usePlacesSessionToken } from './usePlacesSessionToken';
import { useResolvePlace } from './useResolvePlace';

/** State + actions of the search modal. Picking a destination saves it and closes the modal. */
export function usePlaceSearch() {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const draft = useBookingDraft(
    useShallow((s) => ({
      pickup: s.pickup,
      setPickup: s.setPickup,
      setDestination: s.setDestination,
      startPinPicking: s.startPinPicking,
    })),
  );
  const addRecent = useRecentPlaces((s) => s.add);
  // Opened from "Edit pickup" → start in the pickup field.
  const { field } = useLocalSearchParams<{ field?: string }>();
  const initialField: SearchField = field === 'pickup' ? 'pickup' : 'destination';
  const [active, setActive] = useState<SearchField>(initialField);
  const [queries, setQueries] = useState<Record<SearchField, string>>({
    pickup: '',
    destination: '',
  });
  const session = usePlacesSessionToken();
  const bias = draft.pickup?.location ?? null;
  const results = usePlacesAutocomplete(queries[active], session.token, bias);
  const resolve = useResolvePlace(session.token, session.rotate);

  const apply = (place: Place) => {
    if (active === 'pickup') {
      draft.setPickup(place);
      setQueries((q) => ({ ...q, pickup: place.title }));
      setActive('destination');
      return;
    }
    draft.setDestination(place);
    addRecent(place).catch(() => undefined);
    router.back();
  };

  const selectSuggestion = (suggestion: PlaceSuggestion) =>
    resolve.mutate(suggestion, {
      onSuccess: apply,
      onError: (error) => toast.show({ message: t(error.messageKey), tone: 'danger' }),
    });

  const chooseOnMap = () => {
    draft.startPinPicking(active);
    router.back();
  };

  return {
    initialField,
    active,
    queries,
    pickupPlaceholder: draft.pickup?.title,
    setActive,
    setQuery: (field: SearchField, text: string) => setQueries((q) => ({ ...q, [field]: text })),
    results,
    resolving: resolve.isPending,
    selectSuggestion,
    selectRecent: apply,
    chooseOnMap,
    close: () => router.back(),
  };
}
