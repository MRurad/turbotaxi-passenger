import { skipToken, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { ApiError } from '@/api/errors';
import { getTripHistory } from '@/api/services/tripHistory';
import { FIRST_PAGE } from '@/constants/api';
import { queryKeys } from '@/constants/queryKeys';
import { useAuthStore } from '@/features/auth/store';
import type { Paged } from '@/types/paged';

import type { Trip } from '../types';

type TripPages = InfiniteData<Paged<Trip>, number>;

export interface TripHistoryState {
  trips: Trip[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: ApiError | null;
  refetch: () => void;
  loadMore: () => void;
  isLoadingMore: boolean;
  hasMore: boolean;
}

/** GET /api/TripHistory/user/{userId}, paged (newest first); userId from the auth store. */
export function useTripHistory(): TripHistoryState {
  const userId = useAuthStore((s) => s.user?.id);
  const query = useInfiniteQuery<
    Paged<Trip>,
    ApiError,
    TripPages,
    ReturnType<typeof queryKeys.tripHistory>,
    number
  >({
    queryKey: queryKeys.tripHistory(userId ?? 0),
    queryFn:
      userId === undefined
        ? skipToken
        : ({ pageParam, signal }) => getTripHistory(pageParam, { signal }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (last) => (last.hasNextPage ? last.pageNumber + 1 : undefined),
  });

  const trips = useMemo(() => {
    const seen = new Set<number>();
    return (query.data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((trip) => !seen.has(trip.rideId) && seen.add(trip.rideId));
  }, [query.data]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage, refetch: refetchQuery } = query;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage().catch(() => undefined);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const refetch = useCallback(() => {
    refetchQuery().catch(() => undefined);
  }, [refetchQuery]);

  return {
    trips,
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching && !isFetchingNextPage,
    error: query.error,
    refetch,
    loadMore,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
  };
}
