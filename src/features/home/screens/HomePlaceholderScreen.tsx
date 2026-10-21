import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { makeStyles } from '@/theme';

/** Temporary placeholder until the home map screen is built (Prompt 6). */
export function HomePlaceholderScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Screen contentStyle={styles.container}>
      <View style={styles.center}>
        <Text variant="display" color="primary">
          {t('common.appName')}
        </Text>
      </View>
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
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  container: { paddingBottom: t.spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
}));
