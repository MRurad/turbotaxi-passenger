import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/constants/queryKeys';
import { PLACES_STALE_TIME_MS } from '@/constants/timeouts';
import { getLanguage } from '@/i18n';
import { placeDetails } from '@/lib/places';
import type { Place, PlaceSuggestion } from '@/types/place';

/** Suggestion → Place with coordinates (Place Details, or as-is for Photon), cached per id. */
export function useResolvePlace(sessionToken: string, onSessionEnd: () => void) {
  const queryClient = useQueryClient();

  return useMutation<Place, ApiError, PlaceSuggestion>({
    mutationFn: (suggestion) => {
      const language = getLanguage();
      return queryClient.fetchQuery({
        queryKey: queryKeys.places.details(suggestion.placeId, language),
        queryFn: ({ signal }) => placeDetails(suggestion, sessionToken, { language, signal }),
        staleTime: PLACES_STALE_TIME_MS,
      });
    },
    // The details call closes the billing session; the next search gets a fresh token.
    onSettled: onSessionEnd,
  });
}
