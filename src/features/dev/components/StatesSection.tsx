import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card, ConnectionBanner, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

import { Section } from './Section';

const noop = () => undefined;

export function StatesSection() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { sizes, spacing } = useTheme();

  return (
    <>
      <Section title={t('dev.uiKit.sections.skeleton')}>
        <Card>
          <View style={styles.skeletonRow}>
            <Skeleton circle={sizes.avatar.md} />
            <View style={styles.skeletonLines}>
              <Skeleton width="70%" height={spacing.md} />
              <Skeleton width="45%" height={spacing.md} />
            </View>
          </View>
        </Card>
        <Skeleton height={sizes.button.lg * 2} radius="xl" />
      </Section>
      <Section title={t('dev.uiKit.sections.banner')}>
        <ConnectionBanner status="connecting" message={t('common.connection.connecting')} />
        <ConnectionBanner status="offline" message={t('common.connection.offline')} />
      </Section>
      <Section title={t('dev.uiKit.sections.states')}>
        <Card variant="outlined">
          <EmptyState
            icon="car-sport-outline"
            title={t('history.emptyTitle')}
            message={t('history.emptyMessage')}
            actionLabel={t('common.actions.bookRide')}
            onAction={noop}
          />
        </Card>
        <Card variant="outlined">
          <ErrorState
            title={t('errors.title')}
            message={t('errors.network')}
            retryLabel={t('common.actions.retry')}
            onRetry={noop}
          />
        </Card>
      </Section>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  skeletonLines: { flex: 1, gap: t.spacing.sm },
}));
