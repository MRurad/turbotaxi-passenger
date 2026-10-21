import { z } from 'zod';
import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { sameCoords } from '@/lib/geo';
import { getJSON, removeItem, setJSON } from '@/lib/storage';
import { placeSchema, type Place } from '@/types/place';

export const MAX_RECENT_PLACES = 10;

/** Google Maps Platform terms: cached coordinates must be refreshed within 30 days. */
export const RECENT_PLACE_TTL_MS = 30 * 24 * 60 * 60_000;

const recentPlaceSchema = placeSchema.extend({ savedAt: z.number() });
const recentPlacesSchema = z.array(recentPlaceSchema).max(MAX_RECENT_PLACES * 2);

export type RecentPlace = z.infer<typeof recentPlaceSchema>;

function isSamePlace(a: Place, b: Place): boolean {
  return a.placeId && b.placeId ? a.placeId === b.placeId : sameCoords(a.location, b.location);
}

/** Newest first, deduplicated, capped. Pure for testing. */
export function addRecentPlace(list: RecentPlace[], place: Place, now: number): RecentPlace[] {
  return [{ ...place, savedAt: now }, ...list.filter((p) => !isSamePlace(p, place))].slice(
    0,
    MAX_RECENT_PLACES,
  );
}

/** Drops entries older than the TTL. Pure for testing. */
export function freshRecentPlaces(list: RecentPlace[], now: number): RecentPlace[] {
  return list.filter((p) => now - p.savedAt < RECENT_PLACE_TTL_MS);
}

interface RecentPlacesStore {
  places: RecentPlace[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (place: Place) => Promise<void>;
  /** On logout: recent addresses (home, work…) must not leak to the next account. */
  clear: () => Promise<void>;
}

let hydration: Promise<void> | null = null;

/** Recently chosen destinations, persisted in AsyncStorage (addresses only, no PII). */
export const useRecentPlaces = create<RecentPlacesStore>()((set, get) => ({
  places: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return Promise.resolve();
    hydration ??= getJSON(STORAGE_KEYS.recentPlaces, recentPlacesSchema)
      .then((stored) => {
        set({ places: freshRecentPlaces(stored ?? [], Date.now()), hydrated: true });
      })
      .finally(() => {
        hydration = null;
      });
    return hydration;
  },
  add: async (place) => {
    // Never write before the stored list was read, or it would be overwritten.
    await get().hydrate();
    const places = addRecentPlace(get().places, place, Date.now());
    set({ places });
    await setJSON(STORAGE_KEYS.recentPlaces, places);
  },
  clear: async () => {
    set({ places: [], hydrated: false });
    await removeItem(STORAGE_KEYS.recentPlaces);
  },
}));
