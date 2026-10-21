import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';
import { formatElapsed } from '@/lib/format';

import { useElapsedSeconds } from '../hooks/useElapsedSeconds';
import { useRideStore } from '../store';
import { RideCancelButton } from './RideCancelButton';
import { RideFareRow } from './RideFareRow';

/** "Looking for a driver…", elapsed time, class + price, Cancel. */
export function SearchingContent() {
  const styles = useStyles();
  const { t } = useTranslation();
  const startedAt = useRideStore((s) => s.searchStartedAt);
  const elapsed = useElapsedSeconds(startedAt);

  return (
    <>
      <Text variant="heading" accessibilityRole="header">
        {t('ride.searching.title')}
      </Text>
      <Text variant="body" color="textSecondary">
        {t('ride.searching.subtitle')}
      </Text>
      <Text variant="caption" color="textMuted" style={styles.timer} testID="ride-elapsed">
        {t('ride.searching.elapsed', { time: formatElapsed(elapsed) })}
      </Text>
      <RideFareRow />
      <RideCancelButton />
    </>
  );
}

const useStyles = makeStyles(() => ({
  // Equal-width digits: the running timer doesn't jitter.
  timer: { fontVariant: ['tabular-nums'] },
}));
