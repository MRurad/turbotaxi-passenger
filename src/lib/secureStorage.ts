import * as SecureStore from 'expo-secure-store';

import type { SecureKey } from '@/constants/storageKeys';

/**
 * Tokens only. Values live in the iOS Keychain / Android Keystore.
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
