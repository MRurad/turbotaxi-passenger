import type { TFunction } from 'i18next';

import { formatMoney, parseApiDate } from '@/lib/format';

import type { PromoDiscount, UserPromo } from './types';

/** "20% off" / "3,00 ₼ off" (localized). */
export function promoDiscountText(discount: PromoDiscount, t: TFunction): string {
  return discount.kind === 'percentage'
    ? t('promo.discountPercent', { value: discount.value })
    : t('promo.discountAmount', { amount: formatMoney(discount.value) });
}

/** "2 rides left", or null when the promo has no ride limit. */
export function promoRidesLeftText(remainingRides: number | null, t: TFunction): string | null {
  return remainingRides === null ? null : t('promo.ridesLeft', { count: remainingRides });
}

/**
 * Whether the promo can be applied right now. The backend's flags win; dates and remaining
 * rides are checked too in case the list is a little stale.
 */
export function isPromoUsable(promo: UserPromo, now: Date = new Date()): boolean {
  if (!promo.isActive || !promo.canUse) return false;
  if (promo.remainingRides !== null && promo.remainingRides <= 0) return false;
  const start = promo.startDate ? parseApiDate(promo.startDate) : null;
  const end = promo.endDate ? parseApiDate(promo.endDate) : null;
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
}
