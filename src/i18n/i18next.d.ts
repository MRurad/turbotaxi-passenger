import 'i18next';

import type az from './locales/az.json';

// az.json is the source of truth for key types: t('booking.order') is checked at compile time.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof az };
    returnNull: false;
  }
}
