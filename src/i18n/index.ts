import AsyncStorage from '@react-native-async-storage/async-storage';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { STORAGE_KEYS } from '@/constants/storageKeys';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_TAGS,
  SUPPORTED_LANGUAGES,
  getDeviceLanguage,
  isLanguage,
  type Language,
} from './languages';
import az from './locales/az.json';
import en from './locales/en.json';
import ru from './locales/ru.json';

export const resources = {
  az: { translation: az },
  ru: { translation: ru },
  en: { translation: en },
} as const;

const i18n = createInstance();

// Resources are bundled, so init is synchronous: the first render already has strings.
// The device language is used until the saved preference is restored (see restoreLanguage).
i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  nonExplicitSupportedLngs: true,
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Current app language (non-reactive). Use `useTranslation()` in components. */
export function getLanguage(): Language {
  const lng = i18n.resolvedLanguage ?? i18n.language;
  return isLanguage(lng) ? lng : DEFAULT_LANGUAGE;
}

/** Value for the `Accept-Language` header; read lazily by the axios interceptor. */
export function getAcceptLanguage(): string {
  return LANGUAGE_TAGS[getLanguage()];
}

/** Applies the persisted language, if any. Safe to call more than once. */
export async function restoreLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.language);
    if (isLanguage(stored) && stored !== i18n.language) await i18n.changeLanguage(stored);
  } catch {
    // Unreadable preference → keep the device language.
  }
}

export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.language, language);
  } catch {
    // Non-critical: the language still applies for this session.
  }
}

export { i18n };
export * from './languages';
export type { TranslationKey } from './types';
