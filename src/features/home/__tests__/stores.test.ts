import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { useBookingDraft } from '@/features/booking/store';
import {
  addRecentPlace,
  freshRecentPlaces,
  MAX_RECENT_PLACES,
  RECENT_PLACE_TTL_MS,
  useRecentPlaces,
  type RecentPlace,
} from '@/features/home/recentPlaces';
import type { Place } from '@/types/place';

const NOW = 1_800_000_000_000;

const place = (n: number, placeId: string | null = `p${n}`): Place => ({
  placeId,
  title: `Place ${n}`,
  subtitle: 'Baku',
  location: { latitude: 40 + n / 100, longitude: 49 + n / 100 },
});
const recent = (n: number, savedAt = NOW): RecentPlace => ({ ...place(n), savedAt });

describe('addRecentPlace', () => {
  it('puts the newest first and removes duplicates by place id', () => {
    const list = [recent(1), recent(2)];
    expect(addRecentPlace(list, place(2), NOW).map((p) => p.placeId)).toEqual(['p2', 'p1']);
  });

  it('dedupes pins without a place id by coordinates', () => {
    const pin = { ...recent(3), placeId: null };
    expect(addRecentPlace([pin], { ...pin, title: 'Renamed' }, NOW)).toHaveLength(1);
  });

  it('keeps at most 10 and stamps savedAt', () => {
    const many = Array.from({ length: MAX_RECENT_PLACES }, (_, i) => recent(i));
    const next = addRecentPlace(many, place(99), NOW + 1);
    expect(next).toHaveLength(MAX_RECENT_PLACES);
    expect(next[0]).toMatchObject({ placeId: 'p99', savedAt: NOW + 1 });
    expect(next.some((p) => p.placeId === `p${MAX_RECENT_PLACES - 1}`)).toBe(false);
  });

  it('drops entries older than 30 days (Google caching terms)', () => {
    const list = [recent(1, NOW), recent(2, NOW - RECENT_PLACE_TTL_MS - 1)];
    expect(freshRecentPlaces(list, NOW).map((p) => p.placeId)).toEqual(['p1']);
  });
});

describe('useRecentPlaces', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await useRecentPlaces.getState().clear();
  });

  it('persists and hydrates, ignoring invalid stored data', async () => {
    await useRecentPlaces.getState().add(place(1));
    useRecentPlaces.setState({ places: [], hydrated: false });
    await useRecentPlaces.getState().hydrate();
    expect(useRecentPlaces.getState().places.map((p) => p.placeId)).toEqual(['p1']);

    await AsyncStorage.setItem(STORAGE_KEYS.recentPlaces, '{"broken":true}');
    useRecentPlaces.setState({ places: [], hydrated: false });
    await useRecentPlaces.getState().hydrate();
    expect(useRecentPlaces.getState().places).toEqual([]);
  });

  it('add before hydration does not overwrite the stored list', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.recentPlaces, JSON.stringify([recent(1, Date.now())]));
    await useRecentPlaces.getState().add(place(2));
    expect(useRecentPlaces.getState().places.map((p) => p.placeId)).toEqual(['p2', 'p1']);
  });

  it('clear wipes memory and storage (logout)', async () => {
    await useRecentPlaces.getState().add(place(1));
    await useRecentPlaces.getState().clear();
    expect(useRecentPlaces.getState().places).toEqual([]);
    expect(await AsyncStorage.getItem(STORAGE_KEYS.recentPlaces)).toBeNull();
  });
});

describe('booking draft', () => {
  beforeEach(() => useBookingDraft.getState().reset());

  it('lets the center pin set the pickup until a searched pickup locks it', () => {
    const s = useBookingDraft.getState();
    s.setPickupFromPin(place(1));
    expect(useBookingDraft.getState().pickup?.placeId).toBe('p1');

    s.setPickup(place(2));
    s.setPickupFromPin(place(3));
    expect(useBookingDraft.getState().pickup?.placeId).toBe('p2');

    s.unlockPickup();
    s.setPickupFromPin(place(3));
    expect(useBookingDraft.getState().pickup?.placeId).toBe('p3');
  });

  it('choosing the destination on the map never overwrites the pickup (confirm)', () => {
    const s = useBookingDraft.getState();
    s.setPickupFromPin(place(1));
    s.startPinPicking('destination');
    // The pin now sits on the destination; nothing it reports may become the pickup.
    s.setPickupFromPin(place(5));
    s.setDestination(place(5));
    s.setPickupFromPin(place(5));
    expect(useBookingDraft.getState()).toMatchObject({
      pinTarget: 'pickup',
      pickup: { placeId: 'p1' },
      destination: { placeId: 'p5' },
    });
  });

  it('cancelling "choose on map" keeps the original pickup', () => {
    const s = useBookingDraft.getState();
    s.setPickupFromPin(place(1));
    s.startPinPicking('destination');
    s.cancelPinPicking();
    s.setPickupFromPin(place(6)); // pin still where the user dragged for the destination
    expect(useBookingDraft.getState().pickup?.placeId).toBe('p1');

    // Dragging the map in pickup mode afterwards moves the pickup again.
    s.unlockPickup();
    s.setPickupFromPin(place(7));
    expect(useBookingDraft.getState().pickup?.placeId).toBe('p7');
  });

  it('does not unlock the pickup while choosing the destination', () => {
    const s = useBookingDraft.getState();
    s.setPickupFromPin(place(1));
    s.startPinPicking('destination');
    s.unlockPickup();
    expect(useBookingDraft.getState().pickupLocked).toBe(true);
  });
});
