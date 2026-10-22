import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ApiError } from '@/api/errors';
import { getRideDriver } from '@/api/services/drivers';
import { useDriverProfile } from '@/features/ride/hooks/useDriverProfile';
import { createQueryClient } from '@/providers/queryClient';
import type { RideDriver } from '@/types/ride';

jest.mock('@/api/services/drivers', () => ({ getRideDriver: jest.fn() }));

const DRIVER: RideDriver = {
  name: 'Elvin Aliyev',
  phoneNumber: '+994501112233',
  plateNumber: '10-AA-123',
  brand: 'Toyota',
  model: 'Prius',
  color: 'White',
};

let client: QueryClient;
const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  client = createQueryClient();
  client.setDefaultOptions({
    ...client.getDefaultOptions(),
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
  });
});

afterEach(() => client.clear());

describe('useDriverProfile', () => {
  it('fetches nothing without a driver', async () => {
    const { result } = await renderHook(() => useDriverProfile(null), { wrapper });

    expect(getRideDriver).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ data: undefined, isLoading: false });
  });

  it('loads the assigned driver', async () => {
    jest.mocked(getRideDriver).mockResolvedValue(DRIVER);

    const { result } = await renderHook(() => useDriverProfile(4), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(DRIVER));
    expect(getRideDriver).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('fetches the new driver when the driver changes', async () => {
    jest.mocked(getRideDriver).mockResolvedValue(DRIVER);
    const { result, rerender } = await renderHook(
      ({ id }: { id: number | null }) => useDriverProfile(id),
      { wrapper, initialProps: { id: 4 } },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    jest.mocked(getRideDriver).mockResolvedValue({ ...DRIVER, name: 'Kamran' });

    await rerender({ id: 9 });

    await waitFor(() => expect(result.current.data?.name).toBe('Kamran'));
    expect(getRideDriver).toHaveBeenLastCalledWith(9, expect.anything());
  });

  it('reuses the cached profile for the same driver (another observer)', async () => {
    jest.mocked(getRideDriver).mockResolvedValue(DRIVER);
    const first = await renderHook(() => useDriverProfile(4), { wrapper });
    await waitFor(() => expect(first.result.current.data).toBeDefined());

    const second = await renderHook(() => useDriverProfile(4), { wrapper });

    expect(second.result.current.data).toEqual(DRIVER);
    expect(getRideDriver).toHaveBeenCalledTimes(1);
  });

  it('exposes a non-retryable error without retrying', async () => {
    const error = new ApiError({ code: 'notFound' });
    jest.mocked(getRideDriver).mockRejectedValue(error);

    const { result } = await renderHook(() => useDriverProfile(4), { wrapper });

    await waitFor(() => expect(result.current.error).toBe(error));
    expect(getRideDriver).toHaveBeenCalledTimes(1);
  });
});
