import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { toApiError } from '@/api/errors';
import { mapRideDriver } from '@/api/mappers/drivers';
import type { DriverDto, RequestOptions, UserListItemDto, VehicleDto } from '@/api/types';
import type { RideDriver } from '@/types/ride';

/** A missing user / vehicle record leaves those fields empty; anything else fails (retry). */
function emptyIfUnavailable(error: unknown): null {
  const apiError = toApiError(error);
  if (apiError.code === 'forbidden' || apiError.code === 'notFound') return null;
  throw apiError;
}

/**
 * STOP-GAP ADAPTER (docs/BACKEND_REQUESTS.md #1): the ride events carry no driver details, so
 * the assigned driver's card is assembled from the generic read endpoints
 * (driver → its user + vehicle). When the backend sends them in RideStatusUpdated (or adds a
 * passenger-facing endpoint), replace this function; callers only see `RideDriver`.
 * A user / vehicle record that's forbidden or gone leaves those fields empty.
 */
export async function getRideDriver(
  driverId: number,
  { signal }: RequestOptions = {},
): Promise<RideDriver> {
  const { data: driver } = await apiClient.get<DriverDto>(ENDPOINTS.drivers.byId(driverId), {
    signal,
  });
  const [user, vehicle] = await Promise.all([
    driver.userId
      ? apiClient
          .get<UserListItemDto>(ENDPOINTS.users.byId(driver.userId), { signal })
          .then(({ data }) => data)
          .catch(emptyIfUnavailable)
      : null,
    driver.vehicleId
      ? apiClient
          .get<VehicleDto>(ENDPOINTS.vehicles.byId(driver.vehicleId), { signal })
          .then(({ data }) => data)
          .catch(emptyIfUnavailable)
      : null,
  ]);
  return mapRideDriver(user, vehicle);
}
