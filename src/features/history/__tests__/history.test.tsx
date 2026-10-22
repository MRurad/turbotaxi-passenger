import { fireEvent, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';

import { ToastProvider } from '@/components/ui';
import { profileSchema } from '@/features/auth/schemas';
import { TripCard } from '@/features/history/components/TripCard';
import type { Trip } from '@/features/history/types';
import { driverName, tripStatusTone, vehicleLine } from '@/features/history/utils';
import { PromoCard } from '@/features/promo/components/PromoCard';
import type { UserPromo } from '@/features/promo/types';
import { rideRedirect } from '@/features/ride/utils';
import { ROUTES } from '@/constants/routes';
import { i18n } from '@/i18n';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));

const TRIP: Trip = {
  rideId: 12,
  driver: { name: 'Nurlan', surname: 'Mammadov', phoneNumber: null },
  vehicle: { plateNumber: '99LC702', type: 'Comfort', brand: 'Ford', model: 'Fusion' },
  pickupAddress: 'Nizami küç. 12',
  destinationAddress: 'Gənclik',
  fare: 10,
  discountAmount: 2,
  finalFare: 8,
  hasDiscount: true,
  date: '2026-10-21T22:05:50Z',
  status: 'completed',
};
const PROMO: UserPromo = {
  id: 3,
  promoCodeId: 9,
  code: 'WELCOME',
  description: null,
  discount: { kind: 'percentage', value: 20, maxAmount: null },
  startDate: null,
  endDate: null,
  remainingRides: 2,
  usedCount: 0,
  isActive: true,
  canUse: true,
};

beforeEach(() => i18n.changeLanguage('en'));
afterAll(() => i18n.changeLanguage('az'));

describe('history utils', () => {
  it('formats driver, car and status tone', () => {
    expect(driverName(TRIP.driver)).toBe('Nurlan Mammadov');
    expect(vehicleLine(TRIP.vehicle)).toBe('Ford Fusion · 99LC702');
    expect(vehicleLine(null)).toBeNull();
    expect(tripStatusTone('completed')).toBe('success');
    expect(tripStatusTone('cancelled')).toBe('danger');
    expect(tripStatusTone('unknown')).toBe('neutral');
  });
});

describe('TripCard', () => {
  it('shows the route, the paid price with the struck original, and the status', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<TripCard trip={TRIP} onPress={onPress} />);
    expect(screen.getByText('Nizami küç. 12')).toBeTruthy();
    expect(screen.getByText('Gənclik')).toBeTruthy();
    expect(screen.getByText(/^8\.00\s₼$/)).toBeTruthy();
    expect(screen.getByText(/^10\.00\s₼$/)).toBeTruthy();
    // Badges uppercase their label (language-aware).
    expect(screen.getByText(/^completed$/i)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('trip-12'));
    expect(onPress).toHaveBeenCalledWith(12);
  });
});

describe('PromoCard', () => {
  it('copies the code on tap', async () => {
    await renderWithTheme(
      <ToastProvider>
        <PromoCard promo={PROMO} />
      </ToastProvider>,
    );
    expect(screen.getByText('20% off')).toBeTruthy();
    expect(screen.getByText('2 rides left')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('promo-copy-3'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('WELCOME');
  });

  it('a used promo has no copy button', async () => {
    await renderWithTheme(
      <ToastProvider>
        <PromoCard promo={PROMO} used />
      </ToastProvider>,
    );
    expect(screen.queryByTestId('promo-copy-3')).toBeNull();
  });
});

describe('profileSchema', () => {
  it('uses the registration rules without the password', () => {
    const ok = profileSchema.safeParse({
      name: 'Ali',
      surname: 'Əliyev',
      phone: '50 123 45 67',
      email: 'ali@example.com',
    });
    expect(ok.success).toBe(true);
    const bad = profileSchema.safeParse({ name: '', surname: 'X', phone: '12', email: 'nope' });
    expect(bad.success).toBe(false);
  });
});

describe('account screens during a ride', () => {
  it('stay reachable while searching or riding, but the summary still wins', () => {
    expect(rideRedirect('searching', ['(app)', 'profile'])).toBeNull();
    expect(rideRedirect('in_progress', ['(app)', 'history', '[rideId]'])).toBeNull();
    expect(rideRedirect('driver_assigned', ['(app)', 'settings'])).toBeNull();
    expect(rideRedirect('completed', ['(app)', 'promos'])).toBe(ROUTES.rideSummary);
  });
});
