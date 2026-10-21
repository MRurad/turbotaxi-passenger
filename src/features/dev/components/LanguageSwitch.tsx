import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip } from '@/components/ui';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { makeStyles } from '@/theme';

export function LanguageSwitch() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language, changeLanguage } = useChangeLanguage();

  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('dev.uiKit.language')}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <Chip
          key={lng}
          role="radio"
          label={t(`settings.languages.${lng}`)}
          selected={language === lng}
          onPress={() => changeLanguage(lng).catch(() => undefined)}
          testID={`language-${lng}`}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, paddingVertical: t.spacing.xs },
}));
