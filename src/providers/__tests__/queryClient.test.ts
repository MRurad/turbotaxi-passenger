import { QUERY_STALE_TIME_MS } from '@/constants/timeouts';
import { createQueryClient } from '@/providers/queryClient';

describe('createQueryClient', () => {
  it('uses sane defaults (retry 1 / 0, staleTime 30s)', () => {
    const { queries, mutations } = createQueryClient().getDefaultOptions();
    expect(queries?.retry).toBe(1);
    expect(queries?.staleTime).toBe(QUERY_STALE_TIME_MS);
    expect(QUERY_STALE_TIME_MS).toBe(30_000);
    expect(mutations?.retry).toBe(0);
  });
});
