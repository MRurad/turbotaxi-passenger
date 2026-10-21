import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { estimateRoute } from '@/api/services/routes';
import { VEHICLE_TYPES } from '@/constants/vehicles';
import { useRouteEstimates } from '@/features/booking/hooks/useRouteEstimates';
import { useBookingDraft } from '@/features/booking/store';
import { createQueryClient } from '@/providers/queryClient';

jest.mock('@/api/services/routes', () => ({ estimateRoute: jest.fn() }));

const ESTIMATE = {
  distanceKm: 8,
  durationMinutes: 18,
  encodedPolyline: null,
  price: { original: 10, discount: 0, final: 10, currency: 'AZN', hasDiscount: false },
};
const place = (latitude: number, longitude: number) => ({
  placeId: null,
  title: 'x',
  subtitle: '',
  location: { latitude, longitude },
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(estimateRoute).mockResolvedValue(ESTIMATE);
  useBookingDraft.setState({ pickup: place(40.4, 49.8), destination: place(40.45, 49.9) });
});

describe('useRouteEstimates', () => {
  it('POSTs once per vehicle type, however many observers mount, remount or re-render', async () => {
    const client = createQueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const first = await renderHook(() => useRouteEstimates(), { wrapper });
    await renderHook(() => useRouteEstimates(), { wrapper });
    await waitFor(() => expect(first.result.current[0]?.estimate).toEqual(ESTIMATE));

    await first.rerender({});
    await first.unmount();
    await renderHook(() => useRouteEstimates(), { wrapper }); // e.g. the sheet footer remounts
    // Float noise from the map pin (< 1 m) is the same route.
    useBookingDraft.setState({ pickup: place(40.4000001, 49.8000001) });
    await renderHook(() => useRouteEstimates(), { wrapper });

    expect(estimateRoute).toHaveBeenCalledTimes(VEHICLE_TYPES.length);
    client.clear();
  });
});
