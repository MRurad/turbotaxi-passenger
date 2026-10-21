import { az as azLocale, enUS, ru as ruLocale, type Locale } from 'date-fns/locale';
import { getLocales } from 'expo-localization';

export const SUPPORTED_LANGUAGES = ['az', 'ru', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'az';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** First supported device language, else the default (az). */
export function getDeviceLanguage(): Language {
  try {
    const match = getLocales()
      .map((l) => l.languageCode)
      .find(isLanguage);
    return match ?? DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

/** BCP-47 tags for Intl formatters and the Accept-Language header. */
export const LANGUAGE_TAGS: Readonly<Record<Language, string>> = {
  az: 'az-AZ',
  ru: 'ru-RU',
  en: 'en-US',
};

export const DATE_FNS_LOCALES: Readonly<Record<Language, Locale>> = {
  az: azLocale,
  ru: ruLocale,
  en: enUS,
};

/**
 * Locale-correct uppercase. Azerbaijani (like Turkish) maps "i" → "İ"; we do that explicitly
 * because Hermes may ignore the locale argument of toLocaleUpperCase on some platforms.
 */
export function toUpperCaseFor(text: string, language: Language): string {
  if (language === 'az') return text.replace(/i/g, 'İ').toUpperCase();
  return text.toLocaleUpperCase(LANGUAGE_TAGS[language]);
}
