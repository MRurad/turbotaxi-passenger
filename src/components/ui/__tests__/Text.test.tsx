import { screen } from '@testing-library/react-native';

import { Text } from '@/components/ui/Text';
import { i18n } from '@/i18n';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

describe('Text', () => {
  afterEach(() => i18n.changeLanguage('az'));

  it('uppercases label text with the Azerbaijani locale (i → İ)', async () => {
    await i18n.changeLanguage('az');
    await renderWithTheme(<Text variant="label">işıqlı</Text>);
    expect(screen.getByText('İŞIQLI')).toBeTruthy();
  });

  it('leaves other variants untouched', async () => {
    await renderWithTheme(<Text variant="body">Salam</Text>);
    expect(screen.getByText('Salam')).toBeTruthy();
  });
});

describe('Text label variant', () => {
  it('uppercases every string child and keeps an a11y label in normal case', async () => {
    await i18n.changeLanguage('az');
    await renderWithTheme(
      <Text variant="label" testID="t">
        {'qiymət'} {3}
      </Text>,
    );
    expect(screen.getByText('QİYMƏT 3')).toBeTruthy();
    expect(screen.getByTestId('t').props.accessibilityLabel).toBe('qiymət 3');
    await i18n.changeLanguage('az');
  });
});
