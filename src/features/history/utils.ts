import type { BadgeProps } from '@/components/ui';
import type { MappedRideStatus } from '@/constants/rideStatus';

import type { TripDriver, TripVehicle } from './types';

/** Badge color per trip status. */
export function tripStatusTone(status: MappedRideStatus): NonNullable<BadgeProps['tone']> {
  if (status === 'completed') return 'success';
  if (status === 'cancelled' || status === 'no_driver') return 'danger';
  if (status === 'unknown') return 'neutral';
  return 'primary';
}

/** "Toyota Prius · 10-AB-123" (whatever is known), or null. */
export function vehicleLine(vehicle: TripVehicle | null): string | null {
  if (!vehicle) return null;
  const car = [vehicle.brand, vehicle.model].filter(Boolean).join(' ');
  return [car, vehicle.plateNumber].filter(Boolean).join(' · ') || null;
}

/** "Nurlan Mammadov", or null. */
export function driverName(driver: TripDriver | null): string | null {
  if (!driver) return null;
  return [driver.name, driver.surname].filter(Boolean).join(' ') || null;
}
