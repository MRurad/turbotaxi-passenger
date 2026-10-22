import { i18n } from '@/i18n';
import {
  formatClock,
  formatDate,
  formatDay,
  formatDistance,
  formatDuration,
  formatElapsed,
  formatMoney,
  formatRelative,
  formatTime,
  parseApiDate,
} from '@/lib/format';

/** Intl uses (narrow) no-break spaces; compare with plain spaces. */
const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('formatMoney', () => {
  it('formats AZN with two decimals per language', () => {
    expect(plain(formatMoney(12.5, 'en'))).toBe('12.50 ₼');
    expect(plain(formatMoney(12.5, 'az'))).toBe('12,50 ₼');
    expect(plain(formatMoney(12.5, 'ru'))).toBe('12,50 ₼');
  });

  it('groups thousands and rounds', () => {
    expect(plain(formatMoney(1234.567, 'en'))).toBe('1,234.57 ₼');
    expect(plain(formatMoney(0, 'en'))).toBe('0.00 ₼');
  });
});

describe('formatDistance', () => {
  it('uses meters under 1 km, rounded to 10 m', () => {
    expect(formatDistance(0.853, 'en')).toBe('850 m');
    expect(formatDistance(0.853, 'ru')).toBe('850 м');
  });

  it('uses km with one decimal above 1 km', () => {
    expect(formatDistance(4.24, 'en')).toBe('4.2 km');
    expect(formatDistance(4.24, 'az')).toBe('4,2 km');
    expect(formatDistance(4.24, 'ru')).toBe('4,2 км');
    expect(formatDistance(12, 'en')).toBe('12 km');
    expect(formatDistance(0.9996, 'en')).toBe('1 km');
    expect(formatDistance(Number.NaN, 'en')).toBe('');
  });
});

describe('formatDuration', () => {
  it('formats minutes, hours and both', () => {
    expect(formatDuration(5, 'en')).toBe('5 min');
    expect(formatDuration(5, 'az')).toBe('5 dəq');
    expect(formatDuration(60, 'ru')).toBe('1 ч');
    expect(formatDuration(80, 'en')).toBe('1 h 20 min');
    expect(formatDuration(80, 'az')).toBe('1 saat 20 dəq');
  });

  it('never shows 0 minutes', () => {
    expect(formatDuration(0.2, 'en')).toBe('1 min');
    expect(formatDuration(Number.NaN, 'en')).toBe('');
    expect(formatMoney(Number.NaN, 'en')).toBe('');
  });
});

describe('dates', () => {
  it('treats timestamps without a zone as UTC', () => {
    expect(parseApiDate('2026-01-15T12:00:00')?.toISOString()).toBe('2026-01-15T12:00:00.000Z');
    expect(parseApiDate('2026-01-15T12:00:00+04:00')?.toISOString()).toBe(
      '2026-01-15T08:00:00.000Z',
    );
    expect(parseApiDate('2026-01-15T12:00:00+04')?.toISOString()).toBe('2026-01-15T08:00:00.000Z');
    expect(parseApiDate('not a date')).toBeNull();
    expect(parseApiDate('')).toBeNull();
  });

  it('uses the date-fns locale for month names', () => {
    // Noon UTC stays on the same calendar day in every real time zone.
    const iso = '2026-01-15T12:00:00Z';
    expect(formatDate(iso, 'en')).toMatch(/^15 Jan 2026, \d{2}:\d{2}$/);
    expect(formatDate(iso, 'ru')).toMatch(/^15 янв\.? 2026/);
    expect(formatDate(iso, 'az')).toMatch(/^15 yan\.? 2026/i);
  });

  it('formats time and returns empty strings for invalid input', () => {
    expect(formatTime('2026-01-15T12:00:00Z', 'en')).toMatch(/^\d{2}:\d{2}$/);
    expect(formatDate('garbage', 'en')).toBe('');
    expect(formatRelative('garbage', new Date(), 'en')).toBe('');
  });

  it('formats relative to a base date', () => {
    const base = new Date('2026-01-16T12:00:00Z');
    expect(formatRelative('2026-01-15T12:00:00Z', base, 'en')).toMatch(/^yesterday at /);
    expect(formatRelative('2026-01-15T12:00:00Z', base, 'ru')).toMatch(/^вчера в /);
  });
});

/** A UTC ISO string for a local wall-clock time, so tests pass in every time zone. */
const isoFromLocal = (...parts: [number, number, number, number?, number?]) =>
  new Date(parts[0], parts[1], parts[2], parts[3] ?? 0, parts[4] ?? 0).toISOString();

describe('formatMoney (edge cases)', () => {
  afterEach(async () => {
    await i18n.changeLanguage('az');
  });

  it('keeps the minus sign of a real negative amount', () => {
    expect(plain(formatMoney(-12.5, 'en'))).toBe('-12.50 ₼');
  });

  it('never shows a negative zero', () => {
    expect(plain(formatMoney(-0, 'en'))).toBe('0.00 ₼');
    expect(plain(formatMoney(-0.001, 'az'))).toBe('0,00 ₼');
    expect(plain(formatMoney(0.3 - 0.1 - 0.2, 'ru'))).toBe('0,00 ₼');
  });

  it('rounds half a cent up, away from zero', () => {
    expect(plain(formatMoney(0.005, 'en'))).toBe('0.01 ₼');
  });

  it('uses the current app language by default', async () => {
    await i18n.changeLanguage('en');

    expect(plain(formatMoney(3))).toBe('3.00 ₼');
  });

  it('returns an empty string for Infinity', () => {
    expect(formatMoney(Number.POSITIVE_INFINITY, 'en')).toBe('');
  });
});

describe('formatDistance (edge cases)', () => {
  it('clamps negative distances to 0 m', () => {
    expect(formatDistance(-3, 'en')).toBe('0 m');
  });

  it('shows exactly 1 km in kilometers', () => {
    expect(formatDistance(1, 'az')).toBe('1 km');
  });

  it('returns an empty string for Infinity', () => {
    expect(formatDistance(Number.POSITIVE_INFINITY, 'en')).toBe('');
  });
});

describe('formatDuration (edge cases)', () => {
  it('rounds 59.6 minutes up to a whole hour', () => {
    expect(formatDuration(59.6, 'en')).toBe('1 h');
  });

  it('formats hours and minutes in Russian', () => {
    expect(formatDuration(125, 'ru')).toBe('2 ч 5 мин');
  });

  it('formats whole hours in Azerbaijani', () => {
    expect(formatDuration(120, 'az')).toBe('2 saat');
  });

  it('shows at least 1 minute for negative input', () => {
    expect(formatDuration(-10, 'en')).toBe('1 min');
  });
});

describe('formatElapsed', () => {
  it.each([
    [0, '0:00'],
    [42, '0:42'],
    [125, '2:05'],
    [3600, '60:00'],
    [7.9, '0:07'],
    [-5, '0:00'],
  ])('formats %d seconds as %s', (seconds, expected) => {
    expect(formatElapsed(seconds)).toBe(expected);
  });
});

describe('parseApiDate (edge cases)', () => {
  it('accepts a lower-case z and a compact +hhmm offset', () => {
    expect(parseApiDate('2026-01-15T12:00:00z')?.toISOString()).toBe('2026-01-15T12:00:00.000Z');
    expect(parseApiDate('2026-01-15T12:00:00+0400')?.toISOString()).toBe(
      '2026-01-15T08:00:00.000Z',
    );
  });

  it('reads a negative offset', () => {
    expect(parseApiDate('2026-01-15T12:00:00-05:00')?.toISOString()).toBe(
      '2026-01-15T17:00:00.000Z',
    );
  });

  it('treats an ASP.NET timestamp with 7 fractional digits and no zone as UTC', () => {
    expect(parseApiDate('2026-01-15T12:00:00.1234567')?.toISOString()).toBe(
      '2026-01-15T12:00:00.123Z',
    );
  });

  it('treats a time without seconds and no zone as UTC', () => {
    expect(parseApiDate('2026-01-15T12:00')?.toISOString()).toBe('2026-01-15T12:00:00.000Z');
  });

  it('reads a date-only value as UTC midnight, not as a "-15" hour offset', () => {
    expect(parseApiDate('2026-01-15')?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });
});

describe('local-time formatters', () => {
  it('formatDate shows the device-local date and time', () => {
    expect(formatDate(isoFromLocal(2026, 0, 15, 16, 5), 'en')).toBe('15 Jan 2026, 16:05');
  });

  it('formatTime shows the device-local time of a UTC timestamp', () => {
    expect(formatTime(isoFromLocal(2026, 0, 15, 9, 5), 'en')).toBe('09:05');
  });

  it('formatTime returns an empty string for invalid input', () => {
    expect(formatTime('', 'en')).toBe('');
  });

  it('formatClock formats a local Date as HH:mm', () => {
    expect(formatClock(new Date(2026, 0, 15, 7, 3), 'ru')).toBe('07:03');
  });
});

describe('formatDay', () => {
  const now = new Date(2026, 0, 16, 12, 0);

  it.each([
    ['en', 'Today'],
    ['ru', 'Сегодня'],
    ['az', 'Bu gün'],
  ] as const)('labels the same local day as today in %s', (lang, label) => {
    expect(formatDay(isoFromLocal(2026, 0, 16, 0, 30), now, lang)).toBe(label);
  });

  it('labels the previous local day as yesterday', () => {
    expect(formatDay(isoFromLocal(2026, 0, 15, 23, 30), now, 'en')).toBe('Yesterday');
  });

  it('shows the full date for older days', () => {
    expect(formatDay(isoFromLocal(2026, 0, 10, 12), now, 'en')).toBe('10 January 2026');
    expect(formatDay(isoFromLocal(2026, 0, 10, 12), now, 'ru')).toBe('10 января 2026');
  });

  it('returns an empty string for invalid input', () => {
    expect(formatDay('garbage', now, 'en')).toBe('');
  });
});

describe('formatRelative (edge cases)', () => {
  it('uses a weekday within the last week', () => {
    const base = new Date(2026, 0, 16, 12, 0); // Friday
    expect(formatRelative(isoFromLocal(2026, 0, 12, 9, 15), base, 'en')).toBe(
      'last Monday at 9:15 AM',
    );
  });

  it('falls back to a plain date for older values', () => {
    const base = new Date(2026, 0, 16, 12, 0);
    expect(formatRelative(isoFromLocal(2025, 11, 1, 9, 15), base, 'en')).toBe('12/01/2025');
  });
});
