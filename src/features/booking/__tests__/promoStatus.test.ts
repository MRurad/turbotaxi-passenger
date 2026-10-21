import { ApiError } from '@/api/errors';
import type { VehicleEstimate } from '@/features/booking/hooks/useRouteEstimates';
import { getPromoStatus } from '@/features/booking/promoStatus';
import { useBookingDraft } from '@/features/booking/store';

const row = (overrides: Partial<VehicleEstimate> = {}): VehicleEstimate => ({
  vehicleType: 0,
  estimate: undefined,
  isLoading: false,
  isRefreshing: false,
  isFetching: false,
  error: null,
  refetch: () => undefined,
  ...overrides,
});

const priced = (hasDiscount: boolean) =>
  row({
    estimate: {
      distanceKm: 5,
      durationMinutes: 10,
      encodedPolyline: null,
      price: {
        original: 10,
        discount: hasDiscount ? 2 : 0,
        final: hasDiscount ? 8 : 10,
        currency: 'AZN',
        hasDiscount,
      },
    },
  });

describe('getPromoStatus', () => {
  it('is "none" without a promo or while anything is still loading', () => {
    expect(getPromoStatus(false, [priced(true)])).toBe('none');
    expect(getPromoStatus(true, [priced(true), row({ isFetching: true })])).toBe('none');
  });

  it('is "applied" when at least one class is discounted', () => {
    expect(getPromoStatus(true, [priced(false), priced(true)])).toBe('applied');
  });

  it('is "noEffect" when prices loaded but none is discounted', () => {
    expect(getPromoStatus(true, [priced(false), priced(false)])).toBe('noEffect');
  });

  it('is "rejected" when every estimate failed with a client error or envelope', () => {
    const bad = new ApiError({ code: 'badRequest', status: 400 });
    expect(getPromoStatus(true, [row({ error: bad }), row({ error: bad })])).toBe('rejected');
    const envelope = new ApiError({ code: 'envelope' });
    expect(getPromoStatus(true, [row({ error: envelope })])).toBe('rejected');
  });

  it('does not blame the promo for network/server failures', () => {
    const offline = new ApiError({ code: 'network' });
    expect(getPromoStatus(true, [row({ error: offline }), row({ error: offline })])).toBe('none');
  });
});

describe('vehicle auto-select', () => {
  beforeEach(() => useBookingDraft.getState().reset());

  it('switches the default class but never overrides an explicit choice', () => {
    const s = useBookingDraft.getState();
    s.autoSelectVehicle(2);
    expect(useBookingDraft.getState().vehicleType).toBe(2);

    s.selectVehicle(1);
    s.autoSelectVehicle(3);
    expect(useBookingDraft.getState().vehicleType).toBe(1);
  });
});
