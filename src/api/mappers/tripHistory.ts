import type { UserTripHistoryItem } from '@/api/types';
import { mapBackendStatus } from '@/constants/rideStatus';
import type { Trip } from '@/features/history/types';

import { numberOr, optionalString, requireId } from './common';

export function mapTrip(dto: UserTripHistoryItem): Trip {
  const fare = numberOr(dto.fare, 0);
  const discountAmount = numberOr(dto.discountAmount, 0);
  const finalFare = numberOr(dto.finalFare, fare - discountAmount);
  const driverName = optionalString(dto.driverName);
  const driverSurname = optionalString(dto.driverSurname);
  const hasVehicle = [dto.vehiclePlateNumber, dto.vehicleBrand, dto.vehicleModel].some(
    (v) => optionalString(v) !== null,
  );

  return {
    rideId: requireId(dto.rideId, 'trip.rideId'),
    driver:
      driverName || driverSurname
        ? {
            name: driverName ?? '',
            surname: driverSurname ?? '',
            phoneNumber: optionalString(dto.driverPhoneNumber),
          }
        : null,
    vehicle: hasVehicle
      ? {
          plateNumber: optionalString(dto.vehiclePlateNumber),
          type: optionalString(dto.vehicleType),
          brand: optionalString(dto.vehicleBrand),
          model: optionalString(dto.vehicleModel),
        }
      : null,
    pickupAddress: optionalString(dto.pickupAddress),
    destinationAddress: optionalString(dto.destinationAddress),
    fare,
    discountAmount,
    finalFare,
    hasDiscount: discountAmount > 0 && finalFare < fare,
    date: optionalString(dto.rideDateUtc),
    status: mapBackendStatus(dto.status),
  };
}
