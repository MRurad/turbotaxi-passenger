import type { VehicleEstimate } from './hooks/useRouteEstimates';

export type PromoStatus =
  /** No promo, or estimates still loading. */
  | 'none'
  | 'applied'
  /** Every estimate failed with a client error: the backend most likely rejected the code. */
  | 'rejected'
  /** Estimates loaded but none is discounted: the code doesn't apply to this ride. */
  | 'noEffect';

/** Pure: how the selected promo affects the current estimates. */
export function getPromoStatus(hasPromo: boolean, estimates: VehicleEstimate[]): PromoStatus {
  if (!hasPromo) return 'none';
  const settled = estimates.filter((e) => !e.isFetching);
  if (settled.length < estimates.length) return 'none';
  const loaded = settled.filter((e) => e.estimate && !e.error);
  if (loaded.length === 0) {
    const allClientErrors = settled.every(
      (e) => e.error?.status !== undefined && e.error.status >= 400 && e.error.status < 500,
    );
    return allClientErrors || settled.every((e) => e.error?.code === 'envelope')
      ? 'rejected'
      : 'none';
  }
  return loaded.some((e) => e.estimate?.price.hasDiscount) ? 'applied' : 'noEffect';
}
