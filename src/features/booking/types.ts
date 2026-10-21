import type { VehicleType } from '@/constants/vehicles';
import type { LatLng } from '@/types/geo';

export interface EstimateInput {
  origin: LatLng;
  destination: LatLng;
  vehicleType: VehicleType;
  promoCode?: string;
}

export interface RoutePrice {
  original: number;
  discount: number;
  final: number;
  currency: string;
  /** True when a promo lowered the price (show the original struck through). */
  hasDiscount: boolean;
}

export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
  price: RoutePrice;
  encodedPolyline: string | null;
}
