import az from '@/i18n/locales/az.json';
import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const baseKeys = (flat: Record<string, string>) =>
  [...new Set(Object.keys(flat).map((k) => k.replace(PLURAL_SUFFIX, '')))].sort();
const placeholders = (s: string) =>
  (s.match(/{{\s*\w+\s*}}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort();

const locales = { az: flatten(az), ru: flatten(ru), en: flatten(en) };

describe('locale files', () => {
  it('az, ru and en have the same keys (ignoring plural forms)', () => {
    expect(baseKeys(locales.ru)).toEqual(baseKeys(locales.az));
    expect(baseKeys(locales.en)).toEqual(baseKeys(locales.az));
  });

  it('have no empty strings', () => {
    for (const [lang, flat] of Object.entries(locales)) {
      const empty = Object.entries(flat).filter(([, v]) => v.trim() === '');
      expect({ lang, empty }).toEqual({ lang, empty: [] });
    }
  });

  it('every plural key has the forms its language needs', () => {
    const pluralBases = Object.keys(locales.en)
      .filter((k) => k.endsWith('_other'))
      .map((k) => k.replace(/_other$/, ''));
    for (const base of pluralBases) {
      for (const form of ['one', 'other']) {
        expect(locales.az).toHaveProperty([`${base}_${form}`]);
        expect(locales.en).toHaveProperty([`${base}_${form}`]);
      }
      for (const form of ['one', 'few', 'many', 'other']) {
        expect(locales.ru).toHaveProperty([`${base}_${form}`]);
      }
    }
  });

  it('use the same interpolation placeholders as az', () => {
    for (const [key, value] of Object.entries(locales.az)) {
      const base = key.replace(PLURAL_SUFFIX, '');
      for (const flat of [locales.ru, locales.en]) {
        const other = flat[key] ?? flat[`${base}_other`];
        expect({ key, vars: placeholders(other ?? '') }).toEqual({
          key,
          vars: placeholders(value),
        });
      }
    }
  });
});
