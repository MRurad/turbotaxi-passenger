import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Header, ListItem, Screen } from '@/components/ui';
import { makeStyles } from '@/theme';

import { AccountActions } from '../components/AccountActions';
import { LanguagePicker } from '../components/LanguagePicker';
import { SettingsSection } from '../components/SettingsSection';
import { ThemePicker } from '../components/ThemePicker';

/** Language, appearance, about, account (log out, delete account). */
export function SettingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version;

  return (
    <Screen
      scroll
      header={
        <Header
          title={t('settings.title')}
          onBack={() => router.back()}
          backLabel={t('common.a11y.back')}
        />
      }
      contentStyle={styles.content}
      testID="settings-screen"
    >
      <SettingsSection title={t('settings.language')}>
        <LanguagePicker />
      </SettingsSection>
      <SettingsSection title={t('settings.theme')}>
        <ThemePicker />
      </SettingsSection>
      <SettingsSection title={t('settings.about')}>
        <ListItem
          icon="information-circle-outline"
          title={t('common.appName')}
          subtitle={version ? t('settings.version', { version }) : undefined}
        />
      </SettingsSection>
      <SettingsSection title={t('settings.account')}>
        <AccountActions />
      </SettingsSection>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: t.spacing.xl },
}));
