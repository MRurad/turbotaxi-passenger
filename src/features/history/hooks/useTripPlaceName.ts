import { useTranslation } from 'react-i18next';

import { useReverseGeocode } from '@/features/map/hooks/useReverseGeocode';
import type { LatLng } from '@/types/geo';

/**
 * A trip stop's name: the backend's address, or — when it only has coordinates — the address
 * found for them (free geocoder, cached for a day). Never shows raw coordinates.
 */
export function useTripPlaceName(address: string | null, point: LatLng | null) {
  const { t } = useTranslation();
  const geocode = useReverseGeocode(address === null ? point : null);
  const found = geocode.data?.title
    ? [geocode.data.title, geocode.data.subtitle].filter(Boolean).join(', ')
    : null;
  const loading = address === null && point !== null && geocode.isLoading;
  // While loading, screen readers hear "Loading" rather than "Unknown place".
  const fallback = loading ? t('common.labels.loading') : t('history.unknownPlace');
  return { name: address ?? found ?? fallback, loading };
}
