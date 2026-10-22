import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip } from '@/components/ui';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { makeStyles } from '@/theme';

/** AZ / RU / EN — names in their own language, saved and applied at once. */
export function LanguagePicker() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language, changeLanguage } = useChangeLanguage();

  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.language')}
    >
      {SUPPORTED_LANGUAGES.map((value) => (
        <Chip
          key={value}
          label={t(`settings.languages.${value}`)}
          role="radio"
          selected={language === value}
          onPress={() => {
            changeLanguage(value).catch(() => undefined);
          }}
          testID={`language-${value}`}
        />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
