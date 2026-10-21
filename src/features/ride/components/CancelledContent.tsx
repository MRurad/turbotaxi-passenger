import { useTranslation } from 'react-i18next';

import { Button, EmptyState } from '@/components/ui';
import type { TranslationKey } from '@/i18n/types';

import { useRideStore } from '../store';
import type { CancelReason } from '../types';

const REASON_KEYS: Readonly<Record<CancelReason, TranslationKey | null>> = {
  user: 'ride.cancelled.byUser',
  driver: 'ride.cancelled.byDriver',
  unknown: null,
};

/** Who cancelled + "Book again" (back to an empty home). */
export function CancelledContent() {
  const { t } = useTranslation();
  const reason = useRideStore((s) => s.cancelReason);
  const reset = useRideStore((s) => s.reset);
  const reasonKey = reason ? REASON_KEYS[reason] : null;

  return (
    <>
      <EmptyState
        icon="close-circle-outline"
        tone="danger"
        title={t('ride.cancelled.title')}
        message={reasonKey ? t(reasonKey) : undefined}
        testID="ride-cancelled"
      />
      <Button
        label={t('ride.cancelled.bookAgain')}
        size="lg"
        fullWidth
        onPress={reset}
        testID="ride-book-again"
      />
    </>
  );
}
