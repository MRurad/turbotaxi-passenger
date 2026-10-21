import { toEstimateRequest } from '@/api/mappers/routes';
import { toEstimateView } from '@/features/booking/utils';
import type { RouteEstimate } from '@/features/booking/types';
import type { UserPromo } from '@/features/promo/types';
import { isPromoUsable, promoDiscountText, promoRidesLeftText } from '@/features/promo/utils';
import { i18n } from '@/i18n';

const t = i18n.t.bind(i18n);
const plain = (s: string) => s.replace(/[  ]/g, ' ');

const estimate = (price: Partial<RouteEstimate['price']>): RouteEstimate => ({
  distanceKm: 12.37,
  durationMinutes: 25,
  encodedPolyline: null,
  price: { original: 10, discount: 0, final: 10, currency: 'AZN', hasDiscount: false, ...price },
});

const promo = (overrides: Partial<UserPromo> = {}): UserPromo => ({
  id: 1,
  promoCodeId: 10,
  code: 'WELCOME',
  description: 'First rides',
  discount: { kind: 'percentage', value: 20, maxAmount: null },
  startDate: null,
  endDate: null,
  remainingRides: 2,
  usedCount: 0,
  isActive: true,
  canUse: true,
  ...overrides,
});

beforeEach(() => i18n.changeLanguage('en'));
afterAll(() => i18n.changeLanguage('az'));

describe('toEstimateView', () => {
  it('formats price, duration and distance without a discount', () => {
    const view = toEstimateView(estimate({}), 'en');
    expect(plain(view.price)).toBe('10.00 ₼');
    expect(view.originalPrice).toBeNull();
    expect(view.duration).toBe('25 min');
    expect(view.distance).toBe('12.4 km');
  });

  it('shows the original price struck through when discounted', () => {
    const view = toEstimateView(
      estimate({ original: 12, discount: 2.4, final: 9.6, hasDiscount: true }),
      'ru',
    );
    expect(plain(view.price)).toBe('9,60 ₼');
    expect(plain(view.originalPrice ?? '')).toBe('12,00 ₼');
  });
});

describe('estimate request with a promo', () => {
  it('sends the selected promo code (trimmed) with the store userId', () => {
    const request = toEstimateRequest(
      {
        origin: { latitude: 40.4, longitude: 49.8 },
        destination: { latitude: 40.46, longitude: 50.04 },
        vehicleType: 2,
        promoCode: ' WELCOME ',
      },
      7,
    );
    expect(request).toMatchObject({ vehicleType: 2, promoCode: 'WELCOME', userId: 7 });
  });
});

describe('promo display', () => {
  it('formats percentage and fixed discounts', () => {
    expect(promoDiscountText({ kind: 'percentage', value: 20, maxAmount: 5 }, t)).toBe('20% off');
    expect(plain(promoDiscountText({ kind: 'amount', value: 3 }, t))).toBe('3.00 ₼ off');
  });

  it('shows remaining rides with plurals, or nothing when unlimited', () => {
    expect(promoRidesLeftText(1, t)).toBe('1 ride left');
    expect(promoRidesLeftText(3, t)).toBe('3 rides left');
    expect(promoRidesLeftText(null, t)).toBeNull();
  });

  it('uses Russian plural forms', async () => {
    await i18n.changeLanguage('ru');
    expect(promoRidesLeftText(1, t)).toBe('Осталась 1 поездка');
    expect(promoRidesLeftText(3, t)).toBe('Осталось 3 поездки');
    expect(promoRidesLeftText(5, t)).toBe('Осталось 5 поездок');
  });
});

describe('isPromoUsable', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it('accepts an active promo with rides left', () => {
    expect(isPromoUsable(promo(), now)).toBe(true);
    expect(isPromoUsable(promo({ remainingRides: null }), now)).toBe(true);
  });

  it('rejects inactive, unusable, used-up, expired and future promos', () => {
    expect(isPromoUsable(promo({ isActive: false }), now)).toBe(false);
    expect(isPromoUsable(promo({ canUse: false }), now)).toBe(false);
    expect(isPromoUsable(promo({ remainingRides: 0 }), now)).toBe(false);
    expect(isPromoUsable(promo({ endDate: '2026-06-01T00:00:00' }), now)).toBe(false);
    expect(isPromoUsable(promo({ startDate: '2026-07-01T00:00:00' }), now)).toBe(false);
  });
});
