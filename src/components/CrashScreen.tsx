import { useTranslation } from 'react-i18next';

import { ErrorState, Screen } from '@/components/ui';

/** Shown by the ErrorBoundary after an unexpected render error. */
export function CrashScreen({ onRestart }: { onRestart: () => void }) {
  const { t } = useTranslation();
  return (
    <Screen testID="crash-screen">
      <ErrorState
        icon="warning-outline"
        title={t('errors.title')}
        message={t('errors.crash')}
        retryLabel={t('common.actions.restart')}
        onRetry={onRestart}
      />
    </Screen>
  );
}
