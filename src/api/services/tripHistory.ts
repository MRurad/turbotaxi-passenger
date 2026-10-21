import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { mapPaged } from '@/api/mappers/common';
import { mapTrip } from '@/api/mappers/tripHistory';
import type { RequestOptions, UserTripHistoryItemPagedResult } from '@/api/types';
import { DEFAULT_PAGE_SIZE, FIRST_PAGE } from '@/constants/api';
import { requireUserId } from '@/features/auth/store';
import type { Trip } from '@/features/history/types';
import type { Paged } from '@/types/paged';

export async function getTripHistory(
  pageNumber: number = FIRST_PAGE,
  { signal }: RequestOptions = {},
): Promise<Paged<Trip>> {
  const { data } = await apiClient.get<UserTripHistoryItemPagedResult>(
    ENDPOINTS.tripHistory.user(requireUserId()),
    // This endpoint uses PascalCase query names (see Swagger).
    { params: { PageNumber: pageNumber, PageSize: DEFAULT_PAGE_SIZE }, signal },
  );
  return mapPaged(data, mapTrip);
}
