import type { ApplyPromoCodeResponse, UserPromoCodeDto } from '@/api/types';
import { PROMO_DISCOUNT_TYPE } from '@/constants/api';
import type { PromoApplication, PromoDiscount, UserPromo } from '@/features/promo/types';

import { numberOr, optionalString, requireId, requireString } from './common';

function mapDiscount(dto: UserPromoCodeDto): PromoDiscount {
  const value = numberOr(dto.discountValue, 0);
  if (dto.discountType === PROMO_DISCOUNT_TYPE.Amount) return { kind: 'amount', value };
  return { kind: 'percentage', value, maxAmount: dto.maxDiscountAmount ?? null };
}

export function mapUserPromo(dto: UserPromoCodeDto): UserPromo {
  return {
    id: requireId(dto.userPromoCodeId, 'promo.userPromoCodeId'),
    promoCodeId: requireId(dto.promoCodeId, 'promo.promoCodeId'),
    code: requireString(dto.code, 'promo.code'),
    description: optionalString(dto.description),
    discount: mapDiscount(dto),
    startDate: optionalString(dto.startDate),
    endDate: optionalString(dto.endDate),
    remainingRides: dto.remainingRideCount ?? null,
    usedCount: numberOr(dto.usedCount, 0),
    isActive: dto.isActive ?? false,
    canUse: dto.canUse ?? false,
  };
}

export function mapPromoApplication(
  dto: ApplyPromoCodeResponse,
  request: { promoCodeId: number; originalFare: number },
): PromoApplication {
  const originalFare = numberOr(dto.originalFare, request.originalFare);
  const discountAmount = numberOr(dto.discountAmount, 0);
  return {
    promoCodeId: numberOr(dto.promoCodeId, request.promoCodeId),
    originalFare,
    discountAmount,
    finalFare: numberOr(dto.finalFare, originalFare - discountAmount),
  };
}
