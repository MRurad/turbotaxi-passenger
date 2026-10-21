import AsyncStorage from '@react-native-async-storage/async-storage';
import type { z } from 'zod';

import type { StorageKey } from '@/constants/storageKeys';

/**
 * Reads JSON and validates it with `schema`. Missing, unparsable or invalid data returns null,
 * and invalid data is removed so it can't break the next launch either.
 */
export async function getJSON<T>(key: StorageKey, schema: z.ZodType<T>): Promise<T | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const result = schema.safeParse(JSON.parse(raw));
    if (result.success) return result.data;
  } catch {
    // Fall through: not valid JSON.
  }
  await removeItem(key);
  return null;
}

export async function setJSON<T>(key: StorageKey, value: T): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export async function removeItem(key: StorageKey): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Non-critical.
  }
}
