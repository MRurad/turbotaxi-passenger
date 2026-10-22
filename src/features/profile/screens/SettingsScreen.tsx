import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, Button, ConfirmDialog, Header, ListItem, Screen, Text } from '@/components/ui';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { isActivePhase } from '@/features/ride/snapshot';
import { useRideStore } from '@/features/ride/store';
import { makeStyles } from '@/theme';

import { LanguagePicker } from '../components/LanguagePicker';
import { SettingsSection } from '../components/SettingsSection';
import { ThemePicker } from '../components/ThemePicker';

/** Language, appearance, about, account (log out; delete account is a placeholder). */
export function SettingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const logout = useLogout();
  const [confirming, setConfirming] = useState(false);
  const version = Constants.expoConfig?.version;
  // There is no GET active ride: logging out mid-ride would orphan it on the server.
  const rideActive = useRideStore((s) => isActivePhase(s.phase));

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
        <Button
          label={t('settings.logout')}
          variant="danger"
          leftIcon="log-out-outline"
          fullWidth
          disabled={rideActive}
          onPress={() => setConfirming(true)}
          accessibilityHint={rideActive ? t('settings.logoutBlocked') : undefined}
          testID="settings-logout"
        />
        {rideActive ? (
          <Text variant="caption" color="textSecondary">
            {t('settings.logoutBlocked')}
          </Text>
        ) : null}
        <ListItem
          icon="trash-outline"
          title={t('settings.deleteAccount')}
          right={<Badge label={t('common.labels.comingSoon')} />}
          disabled
          accessibilityLabel={t('settings.deleteAccountA11y')}
          testID="settings-delete-account"
        />
      </SettingsSection>
      <ConfirmDialog
        visible={confirming}
        destructive
        title={t('auth.logout.title')}
        message={t('auth.logout.message')}
        confirmLabel={t('auth.logout.confirm')}
        cancelLabel={t('common.actions.cancel')}
        onConfirm={() => {
          setConfirming(false);
          logout().catch(() => undefined);
        }}
        onCancel={() => setConfirming(false)}
        testID="logout-dialog"
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: t.spacing.xl },
}));
