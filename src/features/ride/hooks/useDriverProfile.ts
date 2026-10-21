import { skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { getRideDriver } from '@/api/services/drivers';
import { queryKeys } from '@/constants/queryKeys';
import { DRIVER_PROFILE_STALE_TIME_MS } from '@/constants/timeouts';
import type { RideDriver } from '@/types/ride';

/**
 * Name, phone and car of the assigned driver (null id = no driver yet, nothing fetched).
 * Retries follow the app default (transient errors only).
 */
export function useDriverProfile(driverId: number | null): UseQueryResult<RideDriver, ApiError> {
  return useQuery<RideDriver, ApiError>({
    queryKey: driverId === null ? queryKeys.rideDriverIdle() : queryKeys.rideDriver(driverId),
    queryFn: driverId === null ? skipToken : ({ signal }) => getRideDriver(driverId, { signal }),
    staleTime: DRIVER_PROFILE_STALE_TIME_MS,
  });
}
