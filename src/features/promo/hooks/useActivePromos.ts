import { skipToken, useQuery } from '@tanstack/react-query';

import type { ApiError } from '@/api/errors';
import { getUserPromos } from '@/api/services/promo';
import { queryKeys } from '@/constants/queryKeys';
import { useAuthStore } from '@/features/auth/store';
import type { Paged } from '@/types/paged';

import type { UserPromo } from '../types';
import { isPromoUsable } from '../utils';

/**
 * The user's active promo codes (GET /api/PromoCodes/user/{userId}?activeOnly=true), filtered to
 * ones usable right now. Fetched only when `enabled` (e.g. the promo sheet is open).
 */
export function useActivePromos(enabled: boolean) {
  // userId only for the cache key; the service reads it from the store itself.
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<Paged<UserPromo>, ApiError, UserPromo[]>({
    queryKey: queryKeys.promos(userId ?? 0, true),
    queryFn:
      enabled && userId !== undefined
        ? ({ signal }) => getUserPromos({ activeOnly: true, signal })
        : skipToken,
    select: (page) => page.items.filter((promo) => isPromoUsable(promo)),
  });
}
