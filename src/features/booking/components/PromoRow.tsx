import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, IconButton, ListItem, Text } from '@/components/ui';
import type { UserPromo } from '@/features/promo/types';
import { promoDiscountText } from '@/features/promo/utils';
import { makeStyles } from '@/theme';

import type { PromoStatus } from '../promoStatus';

export interface PromoRowProps {
  promo: UserPromo | null;
  status: PromoStatus;
  onOpen: () => void;
  onRemove: () => void;
}

/** "Add promo code", or the applied promo with its discount, a remove action and its status. */
export function PromoRow({ promo, status, onOpen, onRemove }: PromoRowProps) {
  const styles = useStyles();
  const { t } = useTranslation();

  if (!promo) {
    return (
      <ListItem
        icon="pricetag-outline"
        title={t('booking.promo.add')}
        onPress={onOpen}
        testID="promo-add"
      />
    );
  }

  const problem =
    status === 'rejected'
      ? t('booking.promo.rejected')
      : status === 'noEffect'
        ? t('booking.promo.noEffect')
        : null;

  return (
    <View>
      {/* Remove is a sibling of the row (not nested) so screen readers can reach it. */}
      <View style={styles.row}>
        <View style={styles.item}>
          <ListItem
            icon="pricetag"
            title={t('booking.promo.applied', { code: promo.code })}
            onPress={onOpen}
            showChevron={false}
            testID="promo-applied"
            right={<Badge label={promoDiscountText(promo.discount, t)} tone="success" />}
          />
        </View>
        <IconButton
          icon="close"
          variant="ghost"
          haptic="light"
          onPress={onRemove}
          accessibilityLabel={t('booking.promo.remove')}
          testID="promo-remove"
        />
      </View>
      {problem ? (
        <Text
          variant="caption"
          color={status === 'rejected' ? 'dangerText' : 'warningText'}
          accessibilityLiveRegion="polite"
          style={styles.problem}
          testID="promo-problem"
        >
          {problem}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1 },
  problem: { paddingHorizontal: t.spacing.sm, paddingBottom: t.spacing.xs },
}));
