import { fireEvent, screen } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { PromoRow } from '@/features/booking/components/PromoRow';
import { VehicleRow } from '@/features/booking/components/VehicleRow';
import type { VehicleEstimate } from '@/features/booking/hooks/useRouteEstimates';
import type { UserPromo } from '@/features/promo/types';
import { i18n } from '@/i18n';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

const item = (overrides: Partial<VehicleEstimate> = {}): VehicleEstimate => ({
  vehicleType: 1,
  estimate: {
    distanceKm: 8,
    durationMinutes: 18,
    encodedPolyline: null,
    price: { original: 10, discount: 2, final: 8, currency: 'AZN', hasDiscount: true },
  },
  isLoading: false,
  isRefreshing: false,
  isFetching: false,
  error: null,
  refetch: jest.fn(),
  ...overrides,
});

beforeEach(() => i18n.changeLanguage('en'));
afterAll(() => i18n.changeLanguage('az'));

describe('VehicleRow', () => {
  it('shows name, seats, duration, price and the struck original', async () => {
    const onSelect = jest.fn();
    await renderWithTheme(<VehicleRow item={item()} selected={false} onSelect={onSelect} />);
    expect(screen.getByText('Comfort')).toBeTruthy();
    expect(screen.getByText('4 seats · 18 min')).toBeTruthy();
    // \s matches the no-break space between amount and ₼.
    expect(screen.getByText(/^8\.00\s₼$/)).toBeTruthy();
    expect(screen.getByText(/^10\.00\s₼$/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('vehicle-1'));
    expect(onSelect).toHaveBeenCalled();
  });

  it('cannot be selected while loading', async () => {
    const onSelect = jest.fn();
    await renderWithTheme(
      <VehicleRow
        item={item({ estimate: undefined, isLoading: true })}
        selected={false}
        onSelect={onSelect}
      />,
    );
    await fireEvent.press(screen.getByTestId('vehicle-1'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows an error with retry', async () => {
    const refetch = jest.fn();
    await renderWithTheme(
      <VehicleRow
        item={item({ estimate: undefined, error: new ApiError({ code: 'server' }), refetch })}
        selected={false}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText("Couldn't get a price")).toBeTruthy();
    await fireEvent.press(screen.getByTestId('vehicle-1-retry'));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('PromoRow', () => {
  const promo: UserPromo = {
    id: 1,
    promoCodeId: 10,
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

  it('offers to add a promo', async () => {
    const onOpen = jest.fn();
    await renderWithTheme(
      <PromoRow promo={null} status="none" onOpen={onOpen} onRemove={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText('Add promo code'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('shows the applied promo with its discount and removes it', async () => {
    const onRemove = jest.fn();
    await renderWithTheme(
      <PromoRow promo={promo} status="applied" onOpen={jest.fn()} onRemove={onRemove} />,
    );
    expect(screen.getByText('Promo WELCOME applied')).toBeTruthy();
    expect(screen.getByText('20% OFF')).toBeTruthy(); // Badge label is uppercased
    await fireEvent.press(screen.getByTestId('promo-remove'));
    expect(onRemove).toHaveBeenCalled();
  });
});

describe('booking review fixes', () => {
  const promo: UserPromo = {
    id: 1,
    promoCodeId: 10,
    code: 'WELCOME',
    description: null,
    discount: { kind: 'amount', value: 3 },
    startDate: null,
    endDate: null,
    remainingRides: null,
    usedCount: 0,
    isActive: true,
    canUse: true,
  };

  it('explains a rejected promo and keeps remove reachable', async () => {
    const onRemove = jest.fn();
    await renderWithTheme(
      <PromoRow promo={promo} status="rejected" onOpen={jest.fn()} onRemove={onRemove} />,
    );
    expect(screen.getByTestId('promo-problem')).toHaveTextContent(/can't be used/);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove promo code' }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('shows progress (not the stale error) while a failed estimate is retried', async () => {
    await renderWithTheme(
      <VehicleRow
        item={item({
          estimate: undefined,
          error: new ApiError({ code: 'server' }),
          isFetching: true,
        })}
        selected={false}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.queryByText("Couldn't get a price")).toBeNull();
    expect(screen.queryByTestId('vehicle-1-retry')).toBeNull();
  });

  it('exposes the retry button directly (not nested in the row) for screen readers', async () => {
    await renderWithTheme(
      <VehicleRow
        item={item({ estimate: undefined, error: new ApiError({ code: 'server' }) })}
        selected={false}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Try again: Comfort' })).toBeTruthy();
  });
});
