import { skipToken, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import type { ApiError } from '@/api/errors';
import { getUserPromos } from '@/api/services/promo';
import { FIRST_PAGE } from '@/constants/api';
import { queryKeys } from '@/constants/queryKeys';
import { useAuthStore } from '@/features/auth/store';
import { parseApiDate } from '@/lib/format';
import type { Paged } from '@/types/paged';

import type { UserPromo } from '../types';
import { isPromoUsable } from '../utils';

export interface UserPromosState {
  /** Usable now, or starting later (upcoming). */
  active: UserPromo[];
  /** Used up, expired or switched off. */
  used: UserPromo[];
  isLoading: boolean;
  /** Started offline: nothing loaded yet, waiting for the network (show offline, not empty). */
  isOffline: boolean;
  isRefreshing: boolean;
  error: ApiError | null;
  refetch: () => void;
}

/** Not started yet but otherwise fine: belongs with the active codes, not the used ones. */
function isUpcoming(promo: UserPromo, now: Date): boolean {
  const start = promo.startDate ? parseApiDate(promo.startDate) : null;
  return Boolean(start && start > now) && promo.isActive && promo.remainingRides !== 0;
}

/**
 * All the user's promo codes (GET /api/PromoCodes/user/{userId}), split into active / used on
 * the client. Every page is loaded up front (promo lists are short): a tab is never "empty"
 * while its codes sit on a page nobody scrolled to.
 */
export function useUserPromos(): UserPromosState {
  const userId = useAuthStore((s) => s.user?.id);
  const query = useInfiniteQuery<
    Paged<UserPromo>,
    ApiError,
    InfiniteData<Paged<UserPromo>, number>,
    ReturnType<typeof queryKeys.promoList>,
    number
  >({
    queryKey: queryKeys.promoList(userId ?? 0),
    queryFn:
      userId === undefined
        ? skipToken
        : ({ pageParam, signal }) =>
            getUserPromos({ activeOnly: false, pageNumber: pageParam, signal }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (last) => (last.hasNextPage ? last.pageNumber + 1 : undefined),
  });

  const { hasNextPage, isFetchingNextPage, isError, fetchNextPage, refetch: refetchQuery } = query;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) fetchNextPage().catch(() => undefined);
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage]);

  const { active, used } = useMemo(() => {
    const all = (query.data?.pages ?? []).flatMap((page) => page.items);
    const now = new Date();
    const isActive = (promo: UserPromo) => isPromoUsable(promo, now) || isUpcoming(promo, now);
    return { active: all.filter(isActive), used: all.filter((promo) => !isActive(promo)) };
  }, [query.data]);

  const refetch = useCallback(() => {
    refetchQuery().catch(() => undefined);
  }, [refetchQuery]);

  return {
    active,
    used,
    // Still paging in: the split isn't final yet.
    isLoading: query.isLoading || (hasNextPage === true && !isError),
    isOffline: query.isPending && query.fetchStatus === 'paused',
    isRefreshing: query.isRefetching && !isFetchingNextPage,
    error: query.error,
    refetch,
  };
}
