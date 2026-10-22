import {
  format,
  formatRelative as dfFormatRelative,
  isSameDay,
  isValid,
  parseISO,
  subDays,
} from 'date-fns';

import { DATE_FNS_LOCALES, getLanguage, i18n, LANGUAGE_TAGS, type Language } from '@/i18n';

/** Azerbaijani manat sign. Kept after the amount in every language ("12,50 ₼"). */
export const CURRENCY_SYMBOL = '₼';
const NBSP = ' ';
const METERS_IN_KM = 1000;
const METERS_ROUNDING = 10;
const MINUTES_IN_HOUR = 60;
const DATE_PATTERN = 'd MMM yyyy, HH:mm';
const TIME_PATTERN = 'HH:mm';
const DAY_PATTERN = 'd MMMM yyyy';

// Intl.NumberFormat construction is slow on Hermes; reuse one per locale + precision.
const numberFormats = new Map<string, Intl.NumberFormat>();

function formatNumber(value: number, lang: Language, fractionDigits: { min: number; max: number }) {
  const key = `${lang}:${fractionDigits.min}:${fractionDigits.max}`;
  try {
    let formatter = numberFormats.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat(LANGUAGE_TAGS[lang], {
        minimumFractionDigits: fractionDigits.min,
        maximumFractionDigits: fractionDigits.max,
      });
      numberFormats.set(key, formatter);
    }
    return formatter.format(value);
  } catch {
    // Only if Intl itself is unavailable (a missing locale falls back, it doesn't throw).
    return value.toFixed(fractionDigits.max);
  }
}

/**
 * AZN amount, e.g. "12,50 ₼" (az/ru) or "12.50 ₼" (en). We format the number with Intl and
 * append ₼ ourselves because Hermes' currency output for `az` is inconsistent across platforms.
 * Non-finite input returns ''.
 */
export function formatMoney(amount: number, lang: Language = getLanguage()): string {
  if (!Number.isFinite(amount)) return '';
  return `${formatNumber(amount, lang, { min: 2, max: 2 })}${NBSP}${CURRENCY_SYMBOL}`;
}

/** "850 m" under 1 km, otherwise "4,2 km" / "4.2 km". Non-finite input returns ''. */
export function formatDistance(km: number, lang: Language = getLanguage()): string {
  if (!Number.isFinite(km)) return '';
  const meters = Math.max(0, Math.round((km * METERS_IN_KM) / METERS_ROUNDING) * METERS_ROUNDING);
  // Compare after rounding so 0.999 km reads "1 km", not "1000 m".
  if (meters < METERS_IN_KM) {
    return i18n.t('common.units.meters', { value: meters, lng: lang });
  }
  const value = formatNumber(km, lang, { min: 0, max: 1 });
  return i18n.t('common.units.kilometers', { value, lng: lang });
}

/** "5 min", "1 h", "1 h 20 min" (localized). Rounds to whole minutes, minimum 1. */
export function formatDuration(minutes: number, lang: Language = getLanguage()): string {
  if (!Number.isFinite(minutes)) return '';
  const total = Math.max(1, Math.round(minutes));
  const hours = Math.floor(total / MINUTES_IN_HOUR);
  const rest = total % MINUTES_IN_HOUR;
  if (hours === 0) return i18n.t('common.units.minutes', { value: total, lng: lang });
  if (rest === 0) return i18n.t('common.units.hours', { value: hours, lng: lang });
  return i18n.t('common.units.hoursMinutes', { hours, minutes: rest, lng: lang });
}

const SECONDS_IN_MINUTE = 60;

/** Elapsed time as "m:ss" (e.g. a running search: "0:42", "2:05"). */
export function formatElapsed(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / SECONDS_IN_MINUTE);
  return `${minutes}:${String(seconds % SECONDS_IN_MINUTE).padStart(2, '0')}`;
}

/**
 * Parses a backend timestamp as UTC. ASP.NET often omits the zone designator
 * ("2026-01-15T12:00:00"), which JS would otherwise read as local time.
 * Note: date-only values ("2026-01-15") become UTC midnight — handle birthdates separately.
 */
export function parseApiDate(iso: string): Date | null {
  if (!iso) return null;
  const hasZone = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/.test(iso);
  const date = parseISO(hasZone ? iso : `${iso}Z`);
  return isValid(date) ? date : null;
}

/** "15 Jan 2026, 16:00" in the device time zone. Empty string for invalid input. */
export function formatDate(isoUtc: string, lang: Language = getLanguage()): string {
  const date = parseApiDate(isoUtc);
  return date ? format(date, DATE_PATTERN, { locale: DATE_FNS_LOCALES[lang] }) : '';
}

/** "16:00" in the device time zone. */
export function formatTime(isoUtc: string, lang: Language = getLanguage()): string {
  const date = parseApiDate(isoUtc);
  return date ? format(date, TIME_PATTERN, { locale: DATE_FNS_LOCALES[lang] }) : '';
}

/** Day heading in the device time zone: "Today", "Yesterday" or "15 January 2026". */
export function formatDay(
  isoUtc: string,
  now: Date = new Date(),
  lang: Language = getLanguage(),
): string {
  const date = parseApiDate(isoUtc);
  if (!date) return '';
  if (isSameDay(date, now)) return i18n.t('common.labels.today', { lng: lang });
  if (isSameDay(date, subDays(now, 1))) return i18n.t('common.labels.yesterday', { lng: lang });
  return format(date, DAY_PATTERN, { locale: DATE_FNS_LOCALES[lang] });
}

/** "yesterday at 18:40", "Monday at 09:15", or a date for older values (date-fns wording). */
export function formatRelative(
  isoUtc: string,
  baseDate: Date = new Date(),
  lang: Language = getLanguage(),
): string {
  const date = parseApiDate(isoUtc);
  return date ? dfFormatRelative(date, baseDate, { locale: DATE_FNS_LOCALES[lang] }) : '';
}
