import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { mapCancelledRide, mapCreatedRide, toCreateRideRequest } from '@/api/mappers/rides';
import type { CancelRideByUserRequest, CancelRideResponse, CreateRideResponse } from '@/api/types';
import { requireUserId } from '@/features/auth/store';
import type { CancelledRide, CreatedRide, CreateRideInput } from '@/features/ride/types';

// There is no GET ride / active ride endpoint (docs/BACKEND_REQUESTS.md #3, #4):
// live state comes from SignalR + this create response.

export async function createRide(input: CreateRideInput): Promise<CreatedRide> {
  const { data } = await apiClient.post<CreateRideResponse>(
    ENDPOINTS.rides.create,
    toCreateRideRequest(input, requireUserId()),
  );
  return mapCreatedRide(data);
}

export async function cancelRide(rideId: number): Promise<CancelledRide> {
  const body: CancelRideByUserRequest = { userId: requireUserId() };
  const { data } = await apiClient.post<CancelRideResponse>(
    ENDPOINTS.rides.cancelByUser(rideId),
    body,
  );
  return mapCancelledRide(data, rideId);
}
