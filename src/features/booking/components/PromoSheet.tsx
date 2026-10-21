import { useEffect, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmptyState, ErrorState, Sheet, Skeleton, Text, type SheetRef } from '@/components/ui';
import { useActivePromos } from '@/features/promo/hooks/useActivePromos';
import type { UserPromo } from '@/features/promo/types';
import { makeStyles, useTheme } from '@/theme';

import { PromoListItem } from './PromoListItem';

const SKELETON_ROWS = 3;

export interface PromoSheetProps {
  ref: Ref<SheetRef>;
  /** True once the user opened the sheet: only then are promos fetched. */
  active: boolean;
  selectedId: number | null;
  onSelect: (promo: UserPromo | null) => void;
}

/** Picker for the user's active promo codes; selecting one re-runs the estimates. */
export function PromoSheet({ ref, active, selectedId, onSelect }: PromoSheetProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { sizes } = useTheme();
  const promos = useActivePromos(active);
  const list = promos.data;

  // The applied promo expired or was used up meanwhile: drop it.
  useEffect(() => {
    if (list && selectedId !== null && !list.some((p) => p.id === selectedId)) onSelect(null);
  }, [list, selectedId, onSelect]);

  const body = promos.isError ? (
    <ErrorState
      title={t('booking.promo.loadError')}
      message={t(promos.error.messageKey)}
      retryLabel={t('common.actions.retry')}
      onRetry={() => promos.refetch()}
    />
  ) : !list ? (
    <View style={styles.skeletons}>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <Skeleton key={i} height={sizes.avatar.md} radius="md" />
      ))}
    </View>
  ) : list.length === 0 ? (
    <EmptyState icon="pricetags-outline" title={t('booking.promo.empty')} />
  ) : (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('booking.promo.sheetTitle')}>
      {list.map((promo) => (
        <PromoListItem
          key={promo.id}
          promo={promo}
          selected={promo.id === selectedId}
          onToggle={() => onSelect(promo.id === selectedId ? null : promo)}
        />
      ))}
    </View>
  );

  return (
    <Sheet ref={ref} scrollable testID="promo-sheet">
      <Text variant="heading" accessibilityRole="header">
        {t('booking.promo.sheetTitle')}
      </Text>
      {body}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  skeletons: { gap: t.spacing.md },
}));
