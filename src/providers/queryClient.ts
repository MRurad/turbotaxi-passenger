import { QueryClient } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/constants/timeouts';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: QUERY_STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
