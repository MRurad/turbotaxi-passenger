import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { SECURE_KEYS, STORAGE_KEYS } from '@/constants/storageKeys';
import { VEHICLE_TYPE } from '@/constants/vehicles';
import {
  ACTIVE_RIDE_PHASES,
  clearRidePlaces,
  clearRideSnapshot,
  FINAL_RIDE_PHASES,
  isActivePhase,
  isFinalPhase,
  loadRidePlaces,
  loadRideSnapshot,
  saveRidePlaces,
  saveRideSnapshot,
  type RidePlaces,
  type RideSnapshot,
} from '@/features/ride/snapshot';

const NOW = 1_760_000_000_000;

const snapshot = (overrides: Partial<RideSnapshot> = {}): RideSnapshot => ({
  rideId: 42,
  phase: 'searching',
  driverId: null,
  vehicleType: VEHICLE_TYPE.Comfort,
  fare: { estimated: 8, original: 10, discount: 2, promoCode: 'WELCOME', final: null },
  tripKm: 21.4,
  tripMinutes: 25,
  searchStartedAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const places: RidePlaces = {
  pickup: {
    placeId: null,
    title: '28 May St 12',
    subtitle: 'Baku',
    location: { latitude: 40.4093, longitude: 49.8671 },
  },
  destination: {
    placeId: 'osm:1',
    title: 'Airport',
    subtitle: '',
    location: { latitude: 40.4675, longitude: 50.0467 },
  },
};

type SecureStoreMock = typeof SecureStore & { __reset: () => void };

beforeEach(async () => {
  await AsyncStorage.clear();
  (SecureStore as SecureStoreMock).__reset();
});

describe('phase helpers', () => {
  it.each(ACTIVE_RIDE_PHASES)('isActivePhase(%s) is true and isFinalPhase is false', (phase) => {
    expect(isActivePhase(phase)).toBe(true);
    expect(isFinalPhase(phase)).toBe(false);
  });

  it.each(FINAL_RIDE_PHASES)('isFinalPhase(%s) is true and isActivePhase is false', (phase) => {
    expect(isFinalPhase(phase)).toBe(true);
    expect(isActivePhase(phase)).toBe(false);
  });

  it('treats idle as neither active nor final', () => {
    expect(isActivePhase('idle')).toBe(false);
    expect(isFinalPhase('idle')).toBe(false);
  });
});

describe('ride snapshot storage', () => {
  it('round-trips a saved snapshot', async () => {
    await saveRideSnapshot(snapshot({ phase: 'driver_assigned', driverId: 4 }));

    await expect(loadRideSnapshot()).resolves.toEqual(
      snapshot({ phase: 'driver_assigned', driverId: 4 }),
    );
  });

  it('returns null when nothing is stored', async () => {
    await expect(loadRideSnapshot()).resolves.toBeNull();
  });

  it('returns null after clearRideSnapshot', async () => {
    await saveRideSnapshot(snapshot());

    await clearRideSnapshot();

    await expect(loadRideSnapshot()).resolves.toBeNull();
  });

  it('rejects and removes a snapshot with an unknown vehicle type', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.activeRide,
      JSON.stringify({ ...snapshot(), vehicleType: 9 }),
    );

    await expect(loadRideSnapshot()).resolves.toBeNull();
    await expect(AsyncStorage.getItem(STORAGE_KEYS.activeRide)).resolves.toBeNull();
  });

  it('rejects a snapshot with an unknown phase', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.activeRide,
      JSON.stringify({ ...snapshot(), phase: 'idle' }),
    );

    await expect(loadRideSnapshot()).resolves.toBeNull();
  });

  it('rejects a snapshot with a fractional ride id', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.activeRide,
      JSON.stringify({ ...snapshot(), rideId: 4.2 }),
    );

    await expect(loadRideSnapshot()).resolves.toBeNull();
  });

  it('rejects unparsable JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.activeRide, '{not json');

    await expect(loadRideSnapshot()).resolves.toBeNull();
  });

  it('never writes the places (PII) into AsyncStorage', async () => {
    await saveRideSnapshot(snapshot());
    await saveRidePlaces(places);

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.activeRide);
    expect(raw).not.toContain('28 May St');
    expect(raw).not.toContain('latitude');
  });
});

describe('ride places storage', () => {
  it('round-trips places through SecureStore', async () => {
    await saveRidePlaces(places);

    await expect(loadRidePlaces()).resolves.toEqual(places);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      SECURE_KEYS.activeRidePlaces,
      JSON.stringify(places),
    );
  });

  it('returns null after clearRidePlaces', async () => {
    await saveRidePlaces(places);

    await clearRidePlaces();

    await expect(loadRidePlaces()).resolves.toBeNull();
  });

  it('rejects and deletes places that fail the schema', async () => {
    await SecureStore.setItemAsync(
      SECURE_KEYS.activeRidePlaces,
      JSON.stringify({ pickup: places.pickup }),
    );

    await expect(loadRidePlaces()).resolves.toBeNull();
    await expect(SecureStore.getItemAsync(SECURE_KEYS.activeRidePlaces)).resolves.toBeNull();
  });
});
