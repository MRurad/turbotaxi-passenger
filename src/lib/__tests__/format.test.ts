import {
  formatDate,
  formatDistance,
  formatDuration,
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
