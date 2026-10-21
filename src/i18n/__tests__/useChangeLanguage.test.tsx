import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { getAcceptLanguage, i18n, restoreLanguage, setLanguage } from '@/i18n';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';

describe('language switching', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
    await i18n.changeLanguage('az');
  });

  it('changes the language, persists it and updates Accept-Language', async () => {
    const { result, unmount } = await renderHook(() => useChangeLanguage());
    await act(() => result.current.changeLanguage('ru'));

    expect(result.current.language).toBe('ru');
    expect(i18n.t('common.actions.cancel')).toBe('Отмена');
    expect(getAcceptLanguage()).toBe('ru-RU');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.language)).toBe('ru');
    await unmount();
  });

  it('restores a saved language and ignores invalid values', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.language, 'en');
    await restoreLanguage();
    expect(i18n.language).toBe('en');

    await setLanguage('az');
    await AsyncStorage.setItem(STORAGE_KEYS.language, 'de');
    await restoreLanguage();
    expect(i18n.language).toBe('az');
  });

  it('uses Russian plural forms', async () => {
    await i18n.changeLanguage('ru');
    expect(i18n.t('booking.seats', { count: 1 })).toBe('1 место');
    expect(i18n.t('booking.seats', { count: 3 })).toBe('3 места');
    expect(i18n.t('booking.seats', { count: 5 })).toBe('5 мест');
  });
});
