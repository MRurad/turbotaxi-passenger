import { View } from 'react-native';

import { Card, ConnectionBanner, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

import { UI_KIT_COPY } from '../uiKitCopy';
import { Section } from './Section';

const noop = () => undefined;

export function StatesSection() {
  const styles = useStyles();
  const { sizes } = useTheme();
  const c = UI_KIT_COPY;

  return (
    <>
      <Section title={c.sections.skeleton}>
        <Card>
          <View style={styles.skeletonRow}>
            <Skeleton circle={sizes.avatar.md} />
            <View style={styles.skeletonLines}>
              <Skeleton width="70%" height={14} />
              <Skeleton width="45%" height={12} />
            </View>
          </View>
        </Card>
        <Skeleton height={96} radius="xl" />
      </Section>
      <Section title={c.sections.banner}>
        <ConnectionBanner status="connecting" message={c.banner.connecting} />
        <ConnectionBanner status="offline" message={c.banner.offline} />
      </Section>
      <Section title={c.sections.states}>
        <Card variant="outlined">
          <EmptyState
            icon="car-sport-outline"
            title={c.states.emptyTitle}
            message={c.states.emptyMessage}
            actionLabel={c.states.emptyAction}
            onAction={noop}
          />
        </Card>
        <Card variant="outlined">
          <ErrorState
            title={c.states.errorTitle}
            message={c.states.errorMessage}
            retryLabel={c.states.retry}
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
