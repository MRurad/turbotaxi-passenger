export type PromoDiscount =
  | { kind: 'percentage'; value: number; maxAmount: number | null }
  | { kind: 'amount'; value: number };

export interface UserPromo {
  /** userPromoCodeId (unique per user + promo). */
  id: number;
  promoCodeId: number;
  code: string;
  description: string | null;
  discount: PromoDiscount;
  startDate: string | null;
  endDate: string | null;
  remainingRides: number | null;
  usedCount: number;
  isActive: boolean;
  canUse: boolean;
}

export interface PromoApplication {
  promoCodeId: number;
  originalFare: number;
  discountAmount: number;
  finalFare: number;
}
