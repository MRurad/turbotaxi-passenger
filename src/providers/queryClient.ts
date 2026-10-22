import { QueryClient } from '@tanstack/react-query';

import { isRetryableError } from '@/api/errors';
import { QUERY_STALE_TIME_MS } from '@/constants/timeouts';

/** Automatic query retries (mutations never retry). */
export const QUERY_MAX_RETRIES = 1;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // One retry for network/5xx; a rejected promo or a 400 just doubles the requests.
        retry: (failureCount, error) => failureCount < QUERY_MAX_RETRIES && isRetryableError(error),
        staleTime: QUERY_STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
        // Fail fast with the network error instead of pausing until online: a paused order
        // or cancel would silently run minutes later.
        networkMode: 'always',
      },
    },
  });
}
