import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Card, PressableScale, Text, useToast } from '@/components/ui';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatDate, parseApiDate } from '@/lib/format';
import { makeStyles, useTheme } from '@/theme';

import type { UserPromo } from '../types';
import { promoDiscountText, promoRidesLeftText } from '../utils';

export interface PromoCardProps {
  promo: UserPromo;
  /** Used / expired: muted colors, no copy. */
  used?: boolean;
}

/** Discount on top, the code below (tap to copy), then rides left / validity. */
export const PromoCard = memo(function PromoCard({ promo, used = false }: PromoCardProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const { colors, sizes } = useTheme();
  const toast = useToast();
  const discount = promoDiscountText(promo.discount, t);
  const ridesLeft = promoRidesLeftText(promo.remainingRides, t);
  const start = promo.startDate ? parseApiDate(promo.startDate) : null;
  const upcoming = Boolean(start && start > new Date());
  const validity =
    upcoming && promo.startDate
      ? t('promo.starts', { date: formatDate(promo.startDate, language) })
      : promo.endDate
        ? t('promo.expires', { date: formatDate(promo.endDate, language) })
        : null;

  const copy = () => {
    Clipboard.setStringAsync(promo.code)
      .then(() => toast.show({ message: t('promo.copied'), tone: 'success' }))
      .catch(() => toast.show({ message: t('errors.unknown'), tone: 'danger' }));
  };

  return (
    <Card variant="outlined" padding="lg" style={styles.card}>
      <Text variant="title" color={used ? 'textSecondary' : 'primaryText'}>
        {discount}
      </Text>
      {used ? (
        <Text variant="bodyStrong" color="textSecondary" style={styles.codeText}>
          {promo.code}
        </Text>
      ) : (
        <PressableScale
          onPress={copy}
          haptic="success"
          accessibilityRole="button"
          accessibilityLabel={t('promo.copy', { code: promo.code })}
          style={styles.code}
          testID={`promo-copy-${promo.id}`}
        >
          <Text variant="bodyStrong" style={styles.codeText} numberOfLines={1}>
            {promo.code}
          </Text>
          <Ionicons name="copy-outline" size={sizes.icon.sm} color={colors.primary} />
        </PressableScale>
      )}
      {promo.description ? (
        <Text variant="body" color="textSecondary">
          {promo.description}
        </Text>
      ) : null}
      {ridesLeft || validity ? (
        <View style={styles.meta}>
          {ridesLeft ? (
            <Text variant="caption" color="textSecondary">
              {ridesLeft}
            </Text>
          ) : null}
          {validity ? (
            <Text variant="caption" color="textSecondary">
              {validity}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
});

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.sm },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.sm,
    minHeight: t.sizes.touchTarget,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radii.md,
    borderWidth: t.sizes.border,
    borderStyle: 'dashed',
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primarySoft,
  },
  codeText: { flexShrink: 1, letterSpacing: t.typography.label.letterSpacing },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md },
}));
