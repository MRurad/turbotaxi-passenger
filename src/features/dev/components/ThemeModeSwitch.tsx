import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip, type IconName } from '@/components/ui';
import { makeStyles, THEME_MODES, useThemeMode, type ThemeMode } from '@/theme';

const ICONS: Record<ThemeMode, IconName> = {
  system: 'phone-portrait-outline',
  light: 'sunny-outline',
  dark: 'moon-outline',
};

export function ThemeModeSwitch() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { mode, setMode } = useThemeMode();

  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('dev.uiKit.theme')}
    >
      {THEME_MODES.map((m) => (
        <Chip
          key={m}
          role="radio"
          label={t(`settings.themes.${m}`)}
          icon={ICONS[m]}
          selected={mode === m}
          onPress={() => setMode(m)}
          testID={`theme-${m}`}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, paddingVertical: t.spacing.xs },
}));
