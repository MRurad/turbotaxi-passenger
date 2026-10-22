import { renderHook } from '@testing-library/react-native';

import { useRideMarkerLabels } from '@/features/ride/hooks/useRideMarkerLabels';
import { useRideStore } from '@/features/ride/store';
import { i18n } from '@/i18n';

// 12:00 local time.
const NOW = new Date(2026, 9, 22, 12, 0).getTime();

const labelsFor = async (state: Partial<ReturnType<typeof useRideStore.getState>>) => {
  useRideStore.setState({ phase: 'idle', etaMinutes: null, tripMinutes: null, ...state });
  const { result } = await renderHook(() => useRideMarkerLabels());
  return result.current;
};

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
  useRideStore.getState().reset();
});

describe('useRideMarkerLabels', () => {
  it('while searching shows only the trip time on the destination', async () => {
    const labels = await labelsFor({ phase: 'searching', tripMinutes: 18 });
    expect(labels.pickup).toBeNull();
    expect(labels.destination?.time).toBeUndefined();
    expect(labels.destination?.title).toMatch(/18/);
  });

  it('with the driver on the way: driver ETA on the pickup, arrival = ETA + trip', async () => {
    const labels = await labelsFor({ phase: 'driver_assigned', etaMinutes: 4, tripMinutes: 18 });
    expect(labels.pickup?.title).toMatch(/Driver in .*4/);
    expect(labels.destination?.time).toBe('12:22');
    expect(labels.destination?.accessibilityLabel).toMatch(/Arrive at 12:22$/);
  });

  it('once the driver is here, says so and counts arrival from now', async () => {
    const labels = await labelsFor({ phase: 'driver_arrived', tripMinutes: 18 });
    expect(labels.pickup?.title).toBe('Driver is here');
    expect(labels.destination?.time).toBe('12:18');
    expect(labels.destination?.accessibilityLabel).toMatch(/Arrive at 12:18$/);
  });

  it('during the trip uses the live remaining ETA', async () => {
    const labels = await labelsFor({ phase: 'in_progress', etaMinutes: 7, tripMinutes: 18 });
    expect(labels.pickup).toBeNull();
    expect(labels.destination?.title).toMatch(/7/);
    expect(labels.destination?.time).toBe('12:07');
    expect(labels.destination?.accessibilityLabel).toMatch(/Arrive at 12:07$/);
  });
});
