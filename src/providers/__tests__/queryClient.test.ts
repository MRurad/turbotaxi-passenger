import { ApiError } from '@/api/errors';
import { QUERY_STALE_TIME_MS } from '@/constants/timeouts';
import { createQueryClient } from '@/providers/queryClient';

describe('createQueryClient', () => {
  const { queries, mutations } = createQueryClient().getDefaultOptions();
  const retry = queries?.retry as (count: number, error: unknown) => boolean;

  it('uses sane defaults (staleTime 30s, no mutation retries)', () => {
    expect(queries?.staleTime).toBe(QUERY_STALE_TIME_MS);
    expect(QUERY_STALE_TIME_MS).toBe(30_000);
    expect(mutations?.retry).toBe(0);
  });

  it('retries network/5xx once, never client errors or envelopes', () => {
    expect(retry(0, new ApiError({ code: 'network' }))).toBe(true);
    expect(retry(0, new ApiError({ code: 'server', status: 503 }))).toBe(true);
    expect(retry(1, new ApiError({ code: 'server', status: 503 }))).toBe(false);
    expect(retry(0, new ApiError({ code: 'badRequest', status: 400 }))).toBe(false);
    expect(retry(0, new ApiError({ code: 'envelope' }))).toBe(false);
    expect(retry(0, new ApiError({ code: 'cancelled' }))).toBe(false);
  });
});
