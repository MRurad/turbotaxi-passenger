import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { getLanguage, setLanguage, type Language } from './index';

/**
 * Current language + a setter that persists the choice. Formatters (date-fns locale)
 * and the Accept-Language header read the language lazily, so they follow automatically.
 */
export function useChangeLanguage(): {
  language: Language;
  changeLanguage: (language: Language) => Promise<void>;
} {
  // Subscribes to languageChanged so callers re-render.
  useTranslation();
  const changeLanguage = useCallback((language: Language) => setLanguage(language), []);
  return { language: getLanguage(), changeLanguage };
}
