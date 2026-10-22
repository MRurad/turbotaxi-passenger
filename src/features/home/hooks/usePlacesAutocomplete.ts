import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/api/errors';
import { AUTOCOMPLETE_MIN_CHARS } from '@/constants/google';
import { queryKeys } from '@/constants/queryKeys';
import { AUTOCOMPLETE_DEBOUNCE_MS, PLACES_STALE_TIME_MS } from '@/constants/timeouts';
import { getLanguage } from '@/i18n';
import { autocomplete } from '@/lib/places';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import type { LatLng } from '@/types/geo';
import type { PlaceSuggestion } from '@/types/place';

/**
 * Debounced place autocomplete (provider: constants/places.ts) (AZ only, biased to `bias`, current language).
 * `isActive` is false until the input is long enough, so the screen can show recents instead.
 */
export function usePlacesAutocomplete(input: string, sessionToken: string, bias: LatLng | null) {
  useTranslation();
  const language = getLanguage();
  const debounced = useDebouncedValue(input.trim(), AUTOCOMPLETE_DEBOUNCE_MS);
  const isActive = debounced.length >= AUTOCOMPLETE_MIN_CHARS;

  const query = useQuery<PlaceSuggestion[], ApiError>({
    queryKey: queryKeys.places.autocomplete(debounced, language),
    queryFn: ({ signal }) => autocomplete(debounced, sessionToken, bias, { language, signal }),
    enabled: isActive,
    staleTime: PLACES_STALE_TIME_MS,
    // Keep the old list while the next keystroke's results load (no flicker).
    placeholderData: keepPreviousData,
  });

  return { ...query, isActive, isTyping: input.trim() !== debounced };
}
