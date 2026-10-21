import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { TranslationKey } from '@/i18n/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Backend `VehicleType` is an int 0–3. */
export const VEHICLE_TYPE = {
  Economy: 0,
  Comfort: 1,
  Business: 2,
  Minivan: 3,
} as const;

export type VehicleType = (typeof VEHICLE_TYPE)[keyof typeof VEHICLE_TYPE];

export interface VehicleInfo {
  type: VehicleType;
  /** i18n key, e.g. t(vehicle.labelKey) */
  labelKey: TranslationKey;
  icon: IoniconName;
  seats: number;
}

// TODO confirm with backend (docs/BACKEND_REQUESTS.md #6): names and seat counts for 0–3.
export const VEHICLES: Readonly<Record<VehicleType, VehicleInfo>> = {
  [VEHICLE_TYPE.Economy]: {
    type: VEHICLE_TYPE.Economy,
    labelKey: 'booking.vehicle.economy',
    icon: 'car-outline',
    seats: 4,
  },
  [VEHICLE_TYPE.Comfort]: {
    type: VEHICLE_TYPE.Comfort,
    labelKey: 'booking.vehicle.comfort',
    icon: 'car-sport-outline',
    seats: 4,
  },
  [VEHICLE_TYPE.Business]: {
    type: VEHICLE_TYPE.Business,
    labelKey: 'booking.vehicle.business',
    icon: 'diamond-outline',
    seats: 4,
  },
  [VEHICLE_TYPE.Minivan]: {
    type: VEHICLE_TYPE.Minivan,
    labelKey: 'booking.vehicle.minivan',
    icon: 'bus-outline',
    seats: 7,
  },
};

export const VEHICLE_TYPES: readonly VehicleType[] = [
  VEHICLE_TYPE.Economy,
  VEHICLE_TYPE.Comfort,
  VEHICLE_TYPE.Business,
  VEHICLE_TYPE.Minivan,
];
