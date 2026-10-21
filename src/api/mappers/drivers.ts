import type { UserListItemDto, VehicleDto } from '@/api/types';
import type { RideDriver } from '@/types/ride';

import { optionalString } from './common';

/** Driver's user record + vehicle → what the driver card shows. Missing parts stay null. */
export function mapRideDriver(
  user: UserListItemDto | null,
  vehicle: VehicleDto | null,
): RideDriver {
  const name = [optionalString(user?.name), optionalString(user?.surname)]
    .filter((part): part is string => part !== null)
    .join(' ');
  return {
    name: name || null,
    phoneNumber: optionalString(user?.phoneNumber),
    plateNumber: optionalString(vehicle?.plateNumber),
    brand: optionalString(vehicle?.brand),
    model: optionalString(vehicle?.model),
    color: optionalString(vehicle?.color),
  };
}
