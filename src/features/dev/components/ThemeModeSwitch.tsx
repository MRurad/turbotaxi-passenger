import { View } from 'react-native';

import { Chip } from '@/components/ui';
import { makeStyles, THEME_MODES, useThemeMode } from '@/theme';

import { UI_KIT_COPY } from '../uiKitCopy';

export function ThemeModeSwitch() {
  const styles = useStyles();
  const { mode, setMode } = useThemeMode();

  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={UI_KIT_COPY.themeMode.label}
    >
      {THEME_MODES.map((m) => (
        <Chip
          key={m}
          label={UI_KIT_COPY.themeMode[m]}
          icon={
            m === 'system'
              ? 'phone-portrait-outline'
              : m === 'light'
                ? 'sunny-outline'
                : 'moon-outline'
          }
          role="radio"
          selected={mode === m}
          onPress={() => setMode(m)}
          testID={`theme-${m}`}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: t.spacing.sm, paddingVertical: t.spacing.sm },
}));
