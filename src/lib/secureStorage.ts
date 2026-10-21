import * as SecureStore from 'expo-secure-store';

import type { z } from 'zod';

import type { SecureKey } from '@/constants/storageKeys';

/**
 * Session secrets (tokens) and the signed-in user's PII. Values live in the iOS Keychain /
 * Android Keystore.
 * All helpers swallow platform errors (returning null / false) so a broken keychain logs the
 * user out instead of crashing the app.
 */
export async function getSecureItem(key: SecureKey): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecureItem(key: SecureKey, value: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function removeSecureItem(key: SecureKey): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Already gone or keychain unavailable — nothing else to do.
  }
}

/**
 * JSON in SecureStore, validated with `schema` on read. Missing, unparsable or invalid data
 * returns null and invalid data is deleted. Keep values small (~2 KB keychain item limit).
 */
export async function getSecureJSON<T>(key: SecureKey, schema: z.ZodType<T>): Promise<T | null> {
  const raw = await getSecureItem(key);
  if (raw === null) return null;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    if (result.success) return result.data;
  } catch {
    // Fall through: not valid JSON.
  }
  await removeSecureItem(key);
  return null;
}

export function setSecureJSON<T>(key: SecureKey, value: T): Promise<boolean> {
  return setSecureItem(key, JSON.stringify(value));
}
