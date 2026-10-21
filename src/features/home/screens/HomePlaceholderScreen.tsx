import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, ConfirmDialog, Screen, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useAuthStore } from '@/features/auth/store';
import { makeStyles } from '@/theme';

/** Temporary home until the map screen is built (Prompt 6). Has a temporary logout button. */
export function HomePlaceholderScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const name = useAuthStore((s) => s.user?.name);
  const logout = useLogout();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Screen contentStyle={styles.container} testID="home-placeholder">
      <View style={styles.center}>
        <Text variant="display" color="primary">
          {t('common.appName')}
        </Text>
        {name ? (
          <Text variant="heading" color="textSecondary">
            {t('home.greeting', { name })}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        {__DEV__ ? (
          <Button
            label={t('dev.uiKit.open')}
            leftIcon="color-palette-outline"
            variant="secondary"
            fullWidth
            onPress={() => router.push(ROUTES.devUiKit)}
            testID="open-ui-kit"
          />
        ) : null}
        <Button
          label={t('common.actions.logout')}
          leftIcon="log-out-outline"
          variant="ghost"
          fullWidth
          onPress={() => setConfirmOpen(true)}
          testID="home-logout"
        />
      </View>
      <ConfirmDialog
        visible={confirmOpen}
        destructive
        title={t('auth.logout.title')}
        message={t('auth.logout.message')}
        confirmLabel={t('auth.logout.confirm')}
        cancelLabel={t('common.actions.cancel')}
        onConfirm={() => {
          setConfirmOpen(false);
          logout().catch(() => undefined);
        }}
        onCancel={() => setConfirmOpen(false)}
        testID="logout-dialog"
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  container: { paddingBottom: t.spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.sm },
  actions: { gap: t.spacing.sm },
}));
