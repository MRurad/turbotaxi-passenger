import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Header, Screen, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { makeStyles } from '@/theme';

import { AuthSwitchLink } from '../components/AuthSwitchLink';
import { RegisterForm } from '../components/RegisterForm';
import { useRegister } from '../hooks/useRegister';
import { authErrorMessage } from '../utils/errors';

export function RegisterScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const register = useRegister();
  const { reset: clearError } = register;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(ROUTES.welcome));

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={<Header onBack={goBack} backLabel={t('common.a11y.back')} />}
      testID="register-screen"
    >
      <View style={styles.intro}>
        <Text variant="title" accessibilityRole="header">
          {t('auth.register.title')}
        </Text>
        <Text variant="body" color="textSecondary">
          {t('auth.register.subtitle')}
        </Text>
      </View>
      <RegisterForm
        onSubmit={(values) => register.mutate(values)}
        submitting={register.isPending}
        errorMessage={register.error ? authErrorMessage(register.error, t) : undefined}
        onEdit={clearError}
      />
      <View style={styles.footer}>
        <AuthSwitchLink
          question={t('auth.register.haveAccount')}
          action={t('auth.register.signIn')}
          onPress={() => router.replace(ROUTES.login)}
          testID="register-to-login"
        />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  intro: { gap: t.spacing.xs, marginBottom: t.spacing.xl },
  footer: { marginTop: t.spacing.xl },
}));
