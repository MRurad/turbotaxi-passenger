import { formatDistance, formatDuration, formatMoney } from '@/lib/format';
import type { Language } from '@/i18n';

import type { RouteEstimate } from './types';

/** What a vehicle row shows for one estimate. */
export interface EstimateView {
  price: string;
  /** Pre-discount price to show struck through, or null without a discount. */
  originalPrice: string | null;
  duration: string;
  distance: string;
}

export function toEstimateView(estimate: RouteEstimate, language?: Language): EstimateView {
  const { price } = estimate;
  return {
    price: formatMoney(price.final, language),
    originalPrice: price.hasDiscount ? formatMoney(price.original, language) : null,
    duration: formatDuration(estimate.durationMinutes, language),
    distance: formatDistance(estimate.distanceKm, language),
  };
}
