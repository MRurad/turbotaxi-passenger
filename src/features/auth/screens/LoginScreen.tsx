import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Header, Screen, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { makeStyles } from '@/theme';

import { AuthSwitchLink } from '../components/AuthSwitchLink';
import { LoginForm } from '../components/LoginForm';
import { useLogin } from '../hooks/useLogin';
import { useAuthStore } from '../store';
import { authErrorMessage } from '../utils/errors';

export function LoginScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const login = useLogin();
  const { reset: clearError } = login;
  const sessionExpired = useAuthStore((s) => s.lastLogoutReason === 'expired');
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(ROUTES.welcome));

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={<Header onBack={goBack} backLabel={t('common.a11y.back')} />}
      testID="login-screen"
    >
      <View style={styles.intro}>
        <Text variant="title" accessibilityRole="header">
          {t('auth.login.title')}
        </Text>
        <Text variant="body" color="textSecondary">
          {t('auth.login.subtitle')}
        </Text>
      </View>
      <LoginForm
        onSubmit={(values) => login.mutate(values)}
        submitting={login.isPending}
        errorMessage={login.error ? authErrorMessage(login.error, t) : undefined}
        notice={sessionExpired ? t('errors.sessionExpired') : undefined}
        onEdit={clearError}
      />
      <View style={styles.footer}>
        <AuthSwitchLink
          question={t('auth.login.noAccount')}
          action={t('auth.login.signUp')}
          onPress={() => router.replace(ROUTES.register)}
          testID="login-to-register"
        />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  intro: { gap: t.spacing.xs, marginBottom: t.spacing.xl },
  footer: { marginTop: t.spacing.xl },
}));
