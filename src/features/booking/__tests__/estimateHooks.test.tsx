import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ApiError } from '@/api/errors';
import { estimateRoute } from '@/api/services/routes';
import { VEHICLE_TYPE, VEHICLE_TYPES } from '@/constants/vehicles';
import { useRouteEstimates } from '@/features/booking/hooks/useRouteEstimates';
import { useRoutePolyline } from '@/features/booking/hooks/useRoutePolyline';
import { useSelectedEstimate } from '@/features/booking/hooks/useSelectedEstimate';
import { useBookingDraft } from '@/features/booking/store';
import type { EstimateInput, RouteEstimate } from '@/features/booking/types';
import type { UserPromo } from '@/features/promo/types';
import { createQueryClient } from '@/providers/queryClient';

jest.mock('@/api/services/routes', () => ({ estimateRoute: jest.fn() }));

/** Google's reference polyline: (38.5,-120.2) → (40.7,-120.95) → (43.252,-126.453). */
const POLYLINE = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
const DECODED = [
  { latitude: 38.5, longitude: -120.2 },
  { latitude: 40.7, longitude: -120.95 },
  { latitude: 43.252, longitude: -126.453 },
];

const estimate = (final: number, encodedPolyline: string | null = null): RouteEstimate => ({
  distanceKm: 8,
  durationMinutes: 18,
  encodedPolyline,
  price: { original: final, discount: 0, final, currency: 'AZN', hasDiscount: false },
});
const place = (latitude: number, longitude: number) => ({
  placeId: null,
  title: 'x',
  subtitle: '',
  location: { latitude, longitude },
});
const promo = (code: string): UserPromo => ({
  id: 1,
  promoCodeId: 1,
  code,
  description: null,
  discount: { kind: 'amount', value: 2 },
  startDate: null,
  endDate: null,
  remainingRides: 3,
  usedCount: 0,
  isActive: true,
  canUse: true,
});
/** A different price per class so results can be told apart. */
const priceFor = (input: EstimateInput) => 10 + input.vehicleType;

let client: QueryClient;
const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(estimateRoute)
    .mockImplementation((input) => Promise.resolve(estimate(priceFor(input))));
  useBookingDraft.getState().reset();
  useBookingDraft.setState({ pickup: place(40.4, 49.8), destination: place(40.45, 49.9) });
  client = createQueryClient();
  client.setDefaultOptions({
    ...client.getDefaultOptions(),
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
  });
});

afterEach(() => client.clear());

describe('useRouteEstimates', () => {
  it('does not request anything without a destination', async () => {
    useBookingDraft.setState({ destination: null });

    const { result } = await renderHook(() => useRouteEstimates(), { wrapper });

    expect(estimateRoute).not.toHaveBeenCalled();
    expect(result.current).toHaveLength(VEHICLE_TYPES.length);
    result.current.forEach((row) => {
      expect(row).toMatchObject({ estimate: undefined, isLoading: false, error: null });
    });
  });

  it('returns one estimate per vehicle type, in VEHICLE_TYPES order', async () => {
    const { result } = await renderHook(() => useRouteEstimates(), { wrapper });

    await waitFor(() => expect(result.current.every((row) => row.estimate)).toBe(true));
    expect(result.current.map((row) => row.vehicleType)).toEqual(VEHICLE_TYPES);
    expect(result.current.map((row) => row.estimate?.price.final)).toEqual(
      VEHICLE_TYPES.map((type) => 10 + type),
    );
  });

  it('sends rounded coordinates, the vehicle type and the promo code', async () => {
    useBookingDraft.setState({
      pickup: place(40.123456789, 49.987654321),
      promo: promo('WELCOME'),
    });

    await renderHook(() => useRouteEstimates(), { wrapper });

    await waitFor(() => expect(estimateRoute).toHaveBeenCalledTimes(VEHICLE_TYPES.length));
    expect(estimateRoute).toHaveBeenCalledWith(
      {
        origin: { latitude: 40.12346, longitude: 49.98765 },
        destination: { latitude: 40.45, longitude: 49.9 },
        vehicleType: VEHICLE_TYPE.Comfort,
        promoCode: 'WELCOME',
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('re-estimates when the promo changes (promo is part of the query key)', async () => {
    const { result } = await renderHook(() => useRouteEstimates(), { wrapper });
    await waitFor(() => expect(result.current[0]?.estimate).toBeDefined());

    await act(() => useBookingDraft.getState().setPromo(promo('SAVE2')));

    await waitFor(() => expect(estimateRoute).toHaveBeenCalledTimes(VEHICLE_TYPES.length * 2));
    expect(jest.mocked(estimateRoute).mock.calls.at(-1)?.[0].promoCode).toBe('SAVE2');
  });

  // Regression: `keepPreviousData` does nothing inside useQueries (a changed key gets a fresh
  // observer), so a promo change used to flash skeletons and disable Order. The hook now uses
  // the newest cached price of the class as placeholder.
  it('keeps showing the previous prices while the new key loads (isRefreshing)', async () => {
    const { result } = await renderHook(() => useRouteEstimates(), { wrapper });
    await waitFor(() => expect(result.current[0]?.estimate?.price.final).toBe(10));
    let resolveNew: (value: RouteEstimate) => void = () => undefined;
    jest.mocked(estimateRoute).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveNew = resolve;
        }),
    );

    await act(() => useBookingDraft.getState().setPromo(promo('SAVE2')));

    expect(result.current[0]).toMatchObject({
      isRefreshing: true,
      isLoading: false,
      isFetching: true,
      estimate: { price: { final: 10 } },
    });
    await act(async () => resolveNew(estimate(8)));
  });

  it('reports an error for the failed class only', async () => {
    const error = new ApiError({ code: 'badRequest', serverMessage: 'No route' });
    jest
      .mocked(estimateRoute)
      .mockImplementation((input) =>
        input.vehicleType === VEHICLE_TYPE.Business
          ? Promise.reject(error)
          : Promise.resolve(estimate(priceFor(input))),
      );

    const { result } = await renderHook(() => useRouteEstimates(), { wrapper });

    const business = () => result.current.find((r) => r.vehicleType === VEHICLE_TYPE.Business);
    await waitFor(() => expect(business()?.error).toBe(error));
    expect(business()?.estimate).toBeUndefined();
    const others = result.current.filter((r) => r.vehicleType !== VEHICLE_TYPE.Business);
    others.forEach((row) =>
      expect(row).toMatchObject({ error: null, estimate: expect.anything() }),
    );
  });

  it('refetch retries that class after an error', async () => {
    jest.mocked(estimateRoute).mockRejectedValue(new ApiError({ code: 'badRequest' }));
    const { result } = await renderHook(() => useRouteEstimates(), { wrapper });
    await waitFor(() => expect(result.current[0]?.error).not.toBeNull());
    jest
      .mocked(estimateRoute)
      .mockImplementation((input) => Promise.resolve(estimate(priceFor(input))));

    await act(async () => result.current[0]?.refetch());

    await waitFor(() => expect(result.current[0]?.estimate?.price.final).toBe(10));
    expect(result.current[0]?.error).toBeNull();
  });
});

describe('useSelectedEstimate', () => {
  it('returns the estimate of the vehicle chosen in the draft', async () => {
    useBookingDraft.getState().selectVehicle(VEHICLE_TYPE.Business);

    const { result } = await renderHook(() => useSelectedEstimate(), { wrapper });

    await waitFor(() => expect(result.current?.estimate).toBeDefined());
    expect(result.current).toMatchObject({
      vehicleType: VEHICLE_TYPE.Business,
      estimate: { price: { final: 10 + VEHICLE_TYPE.Business } },
    });
  });

  it('follows a vehicle change from the cache without new requests', async () => {
    const { result } = await renderHook(() => useSelectedEstimate(), { wrapper });
    await waitFor(() => expect(result.current?.estimate).toBeDefined());

    await act(() => useBookingDraft.getState().selectVehicle(VEHICLE_TYPE.Minivan));

    expect(result.current?.estimate?.price.final).toBe(10 + VEHICLE_TYPE.Minivan);
    expect(estimateRoute).toHaveBeenCalledTimes(VEHICLE_TYPES.length);
  });
});

describe('useRoutePolyline', () => {
  it('is empty while there is no route', async () => {
    useBookingDraft.setState({ destination: null });

    const { result } = await renderHook(() => useRoutePolyline(), { wrapper });

    expect(result.current).toEqual([]);
  });

  it("decodes the selected vehicle's polyline", async () => {
    jest
      .mocked(estimateRoute)
      .mockImplementation((input) =>
        Promise.resolve(
          estimate(priceFor(input), input.vehicleType === VEHICLE_TYPE.Economy ? POLYLINE : null),
        ),
      );

    const { result } = await renderHook(() => useRoutePolyline(), { wrapper });

    await waitFor(() => expect(result.current).toHaveLength(3));
    result.current.forEach((point, i) => {
      expect(point.latitude).toBeCloseTo(DECODED[i]?.latitude ?? NaN, 5);
      expect(point.longitude).toBeCloseTo(DECODED[i]?.longitude ?? NaN, 5);
    });
  });

  it("falls back to another class's route when the selected class failed", async () => {
    useBookingDraft.getState().selectVehicle(VEHICLE_TYPE.Business);
    jest
      .mocked(estimateRoute)
      .mockImplementation((input) =>
        input.vehicleType === VEHICLE_TYPE.Business
          ? Promise.reject(new ApiError({ code: 'badRequest' }))
          : Promise.resolve(estimate(priceFor(input), POLYLINE)),
      );

    const { result } = await renderHook(() => useRoutePolyline(), { wrapper });

    await waitFor(() => expect(result.current).toHaveLength(3));
  });
});
