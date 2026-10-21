import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button, Screen } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { makeStyles, useTheme } from '@/theme';

import { AuthHero } from '../components/AuthHero';
import { FormBanner } from '../components/FormBanner';
import { useAuthStore } from '../store';

export function WelcomeScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { motion } = useTheme();
  // A session that expired while the app was closed lands here, so explain it here too.
  const sessionExpired = useAuthStore((s) => s.lastLogoutReason === 'expired');

  return (
    // scroll: on small phones with large Dynamic Type the hero must not push the buttons off.
    <Screen scroll contentStyle={styles.content} testID="welcome-screen">
      <View style={styles.top}>
        <LanguageSwitcher compact />
      </View>
      {sessionExpired ? <FormBanner message={t('errors.sessionExpired')} tone="info" /> : null}
      <AuthHero />
      <Animated.View
        entering={FadeInUp.delay(motion.duration.fast).duration(motion.duration.slow)}
        style={styles.actions}
      >
        <Button
          label={t('auth.welcome.login')}
          size="lg"
          fullWidth
          onPress={() => router.push(ROUTES.login)}
          testID="welcome-login"
        />
        <Button
          label={t('auth.welcome.createAccount')}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => router.push(ROUTES.register)}
          testID="welcome-register"
        />
      </Animated.View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: t.spacing.xl, paddingBottom: t.spacing.lg },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: t.spacing.sm },
  actions: { gap: t.spacing.md },
}));
