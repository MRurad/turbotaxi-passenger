import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip, type IconName } from '@/components/ui';
import { makeStyles, THEME_MODES, useThemeMode, type ThemeMode } from '@/theme';

const ICONS: Readonly<Record<ThemeMode, IconName>> = {
  system: 'phone-portrait-outline',
  light: 'sunny-outline',
  dark: 'moon-outline',
};

/** System / Light / Dark (saved; "System" follows the phone). */
export function ThemePicker() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();

  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.theme')}
    >
      {THEME_MODES.map((value) => (
        <Chip
          key={value}
          label={t(`settings.themes.${value}`)}
          icon={ICONS[value]}
          role="radio"
          selected={mode === value}
          onPress={() => setMode(value)}
          testID={`theme-${value}`}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
