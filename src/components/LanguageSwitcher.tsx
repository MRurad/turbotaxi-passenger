import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip } from '@/components/ui';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { makeStyles } from '@/theme';

export interface LanguageSwitcherProps {
  /** Short codes (AZ / RU / EN) for tight spots like the welcome header. */
  compact?: boolean;
  testID?: string;
}

/** Single-select language picker; the choice is persisted by useChangeLanguage. */
export function LanguageSwitcher({ compact = false, testID }: LanguageSwitcherProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language, changeLanguage } = useChangeLanguage();

  return (
    <View
      testID={testID}
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.language')}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <Chip
          key={lng}
          role="radio"
          label={compact ? t(`settings.languageShort.${lng}`) : t(`settings.languages.${lng}`)}
          accessibilityLabel={t(`settings.languages.${lng}`)}
          selected={language === lng}
          onPress={() => changeLanguage(lng).catch(() => undefined)}
          testID={`language-${lng}`}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
