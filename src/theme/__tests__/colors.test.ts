import { darkColors, lightColors } from '@/theme/colors';
import { themes } from '@/theme/createTheme';

describe('color tokens', () => {
  it('light and dark define exactly the same semantic keys', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('uses steel blue as the light primary', () => {
    expect(lightColors.primary).toBe('#4682B4');
  });

  it('prebuilds stable theme objects per scheme', () => {
    expect(themes.light.isDark).toBe(false);
    expect(themes.dark.isDark).toBe(true);
    expect(themes.dark.colors).toBe(darkColors);
  });
});
