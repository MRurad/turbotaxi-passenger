import { ApiError } from '@/api/errors';
import { getTripHistory } from '@/api/services/tripHistory';
import { ACTIVE_RIDE_STALE_MS } from '@/constants/timeouts';
import type { Trip } from '@/features/history/types';
import { checkPersistedRide, decideRecovery, isStillCurrent } from '@/features/ride/recovery';
import type { RideSnapshot } from '@/features/ride/snapshot';

jest.mock('@/api/services/tripHistory', () => ({ getTripHistory: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn() } }));

const NOW = 1_800_000_000_000;
const snapshot = (overrides: Partial<RideSnapshot> = {}): RideSnapshot => ({
  rideId: 2,
  phase: 'in_progress',
  driverId: 4,
  vehicleType: 1,
  fare: { estimated: 5, original: 5, discount: 0, promoCode: null, final: null },
  tripKm: 3,
  tripMinutes: 8,
  searchStartedAt: NOW - 120_000,
  updatedAt: NOW - 60_000,
  ...overrides,
});
const trip = (rideId: number, status: Trip['status']): Trip => ({
  rideId,
  driver: null,
  vehicle: null,
  pickupAddress: null,
  destinationAddress: null,
  pickupPoint: null,
  destinationPoint: null,
  fare: 5,
  discountAmount: 0,
  finalFare: 5,
  hasDiscount: false,
  date: null,
  status,
});
const page = (items: Trip[]) => ({
  items,
  pageNumber: 1,
  pageSize: 20,
  totalCount: items.length,
  totalPages: 1,
  hasNextPage: false,
});

beforeEach(() => jest.clearAllMocks());

describe('decideRecovery', () => {
  it('moves to the final state when history says completed / cancelled', () => {
    expect(decideRecovery(snapshot(), trip(2, 'completed'), NOW)).toMatchObject({
      kind: 'finished',
      phase: 'completed',
      trip: { rideId: 2, finalFare: 5 },
    });
    expect(decideRecovery(snapshot(), trip(2, 'cancelled'), NOW)).toMatchObject({
      kind: 'finished',
      phase: 'cancelled',
    });
  });

  it('final in history wins even over a stale snapshot', () => {
    const old = snapshot({ updatedAt: NOW - ACTIVE_RIDE_STALE_MS - 1 });
    expect(decideRecovery(old, trip(2, 'completed'), NOW).kind).toBe('finished');
  });

  it('restores when history has it active, unknown, or not at all', () => {
    expect(decideRecovery(snapshot(), trip(2, 'in_progress'), NOW).kind).toBe('restore');
    expect(decideRecovery(snapshot(), trip(2, 'unknown'), NOW).kind).toBe('restore');
    expect(decideRecovery(snapshot(), null, NOW).kind).toBe('restore');
    expect(decideRecovery(snapshot(), 'unavailable', NOW).kind).toBe('restore');
  });

  it('resets after 3 h when history cannot confirm an end (last fallback)', () => {
    const old = snapshot({ updatedAt: NOW - ACTIVE_RIDE_STALE_MS - 1 });
    expect(decideRecovery(old, null, NOW).kind).toBe('expired');
    expect(decideRecovery(old, 'unavailable', NOW).kind).toBe('expired');
  });

  it('does nothing without a snapshot', () => {
    expect(decideRecovery(null, null, NOW).kind).toBe('none');
  });
});

describe('checkPersistedRide', () => {
  it('looks the ride up on the first trip-history page', async () => {
    jest
      .mocked(getTripHistory)
      .mockResolvedValue(page([trip(1, 'completed'), trip(2, 'cancelled')]));
    await expect(checkPersistedRide(snapshot(), { now: NOW })).resolves.toMatchObject({
      kind: 'finished',
      phase: 'cancelled',
    });
    expect(getTripHistory).toHaveBeenCalledWith(1, expect.anything());
  });

  it('a failed history request restores instead of ending a live ride', async () => {
    jest.mocked(getTripHistory).mockRejectedValue(new ApiError({ code: 'network' }));
    await expect(checkPersistedRide(snapshot(), { now: NOW })).resolves.toMatchObject({
      kind: 'restore',
    });
  });

  it('propagates cancellation and a missing session instead of restoring', async () => {
    jest.mocked(getTripHistory).mockRejectedValueOnce(new ApiError({ code: 'cancelled' }));
    await expect(checkPersistedRide(snapshot(), { now: NOW })).rejects.toMatchObject({
      code: 'cancelled',
    });
    jest.mocked(getTripHistory).mockRejectedValueOnce(new ApiError({ code: 'sessionExpired' }));
    await expect(checkPersistedRide(snapshot(), { now: NOW })).rejects.toMatchObject({
      code: 'sessionExpired',
    });
  });

  it('does not call the server for a final snapshot or no snapshot', async () => {
    await expect(
      checkPersistedRide(snapshot({ phase: 'completed' }), { now: NOW }),
    ).resolves.toMatchObject({ kind: 'restore' });
    await expect(checkPersistedRide(null, { now: NOW })).resolves.toEqual({ kind: 'none' });
    expect(getTripHistory).not.toHaveBeenCalled();
  });
});

describe('isStillCurrent', () => {
  it('is false once the ride changed during the check', () => {
    expect(isStillCurrent(snapshot(), snapshot())).toBe(true);
    expect(isStillCurrent(snapshot(), snapshot({ updatedAt: NOW }))).toBe(false);
    expect(isStillCurrent(snapshot(), snapshot({ rideId: 3 }))).toBe(false);
    expect(isStillCurrent(snapshot(), null)).toBe(false);
    expect(isStillCurrent(null, null)).toBe(true);
  });
});
