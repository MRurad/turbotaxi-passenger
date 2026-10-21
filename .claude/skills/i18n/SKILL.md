---
name: i18n
description: Translations for Azerbaijani (default), Russian and English with i18next — key naming, plurals, formatting money/dates/distances, language switching. Use whenever adding or changing user-facing text.
---

# i18n

## Setup (src/i18n)
- `index.ts`: i18next + react-i18next, `fallbackLng: 'az'`, `supportedLngs: ['az','ru','en']`. The initial language is the saved preference (AsyncStorage) if present, otherwise the device language from `expo-localization` if supported, otherwise `az`.
- `locales/az.json`, `ru.json`, `en.json` use the **same key tree**.
- Typed keys: declare `resources` in `src/i18n/i18next.d.ts` using `az.json` as the source type, so `t('booking.order')` is type-checked.
- `useChangeLanguage()` persists the choice and updates the `Accept-Language` header (read lazily by the axios interceptor) and the date-fns locale.

## Keys
- Nest keys by feature: `auth.login.title`, `booking.vehicle.economy`, `ride.status.searching`, `common.actions.cancel`, `errors.network`.
- Use `common.*` for shared words (save, cancel, retry, done, back).
- Use `errors.*` for every `ApiError` code and the generic network, timeout and unknown messages.
- Use interpolation: `"ride.etaMinutes": "{{count}} dəq"`. For plurals use i18next `_one` / `_other` (Russian also needs `_few` / `_many`).
- Don't concatenate translated pieces into sentences; put the whole sentence in one key.

## Formatting (src/lib/format.ts)
- `formatMoney(amount)` → `Intl.NumberFormat(locale, { style: 'currency', currency: 'AZN' })`. If Hermes Intl output looks wrong for `az`, fall back to `"12.50 ₼"`.
- `formatDistance(km)` → `"850 m"` / `"4.2 km"`.
- `formatDuration(min)`.
- `formatDate(isoUtc)` uses date-fns with the az/ru/enUS locale, and converts from UTC to local time.

## Tone
- Azerbaijani: polite, short, natural (use "Siz" forms). Russian: "Вы" form. English: friendly and concise.
- Every time you add a key, add it to all three files in the same edit. A missing key is a bug.
- Provide quality translations yourself. Don't leave English text in the az/ru files.
