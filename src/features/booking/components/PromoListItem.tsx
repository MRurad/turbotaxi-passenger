import { useTranslation } from 'react-i18next';

import { Badge, ListItem } from '@/components/ui';
import type { UserPromo } from '@/features/promo/types';
import { promoDiscountText, promoRidesLeftText } from '@/features/promo/utils';

export interface PromoListItemProps {
  promo: UserPromo;
  selected: boolean;
  /** Tapping the selected promo again removes it. */
  onToggle: () => void;
}

/** Code, description, discount and remaining rides of one promo in the picker. */
export function PromoListItem({ promo, selected, onToggle }: PromoListItemProps) {
  const { t } = useTranslation();
  const ridesLeft = promoRidesLeftText(promo.remainingRides, t);
  const discount = promoDiscountText(promo.discount, t);
  const subtitle = [promo.description, ridesLeft].filter(Boolean).join(' · ');

  return (
    <ListItem
      icon={selected ? 'checkmark-circle' : 'pricetag-outline'}
      title={promo.code}
      subtitle={subtitle || undefined}
      onPress={onToggle}
      showChevron={false}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[promo.code, discount, subtitle].filter(Boolean).join(', ')}
      testID={`promo-${promo.id}`}
      right={<Badge label={discount} tone="success" />}
    />
  );
}
