import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';

import { Chip, EmptyState, ErrorState, Header, Screen } from '@/components/ui';
import { TripCardSkeleton } from '@/features/history/components/TripCardSkeleton';
import { isActivePhase } from '@/features/ride/snapshot';
import { useRideStore } from '@/features/ride/store';
import { makeStyles, useTheme } from '@/theme';

import { PromoCard } from '../components/PromoCard';
import { useUserPromos } from '../hooks/useUserPromos';
import type { UserPromo } from '../types';

type PromoTab = 'active' | 'used';
const TABS: readonly PromoTab[] = ['active', 'used'];
const SKELETON_CARDS = 3;

/** My promo codes: Active / Used tabs, pull to refresh. */
export function PromosScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const promos = useUserPromos();
  const rideActive = useRideStore((s) => isActivePhase(s.phase));
  const [tab, setTab] = useState<PromoTab>('active');
  const items = tab === 'active' ? promos.active : promos.used;

  const renderItem = useCallback(
    ({ item }: { item: UserPromo }) => <PromoCard promo={item} used={tab === 'used'} />,
    [tab],
  );
  const refreshControl = (
    <RefreshControl
      refreshing={promos.isRefreshing}
      onRefresh={promos.refetch}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surfaceElevated}
    />
  );

  let content;
  if (promos.isLoading) {
    content = (
      <View
        style={styles.list}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('common.labels.loading')}
      >
        {Array.from({ length: SKELETON_CARDS }, (_, i) => (
          <TripCardSkeleton key={i} />
        ))}
      </View>
    );
  } else if (promos.isOffline) {
    content = (
      <ErrorState
        icon="cloud-offline-outline"
        title={t('errors.title')}
        message={t('errors.network')}
        retryLabel={t('common.actions.retry')}
        onRetry={promos.refetch}
      />
    );
  } else if (promos.error && promos.active.length + promos.used.length === 0) {
    content = (
      <ErrorState
        title={t('errors.title')}
        message={t(promos.error.messageKey)}
        retryLabel={t('common.actions.retry')}
        onRetry={promos.refetch}
      />
    );
  } else {
    // Empty still renders the list, so pull-to-refresh works there too.
    content = (
      <FlatList
        data={items}
        keyExtractor={(promo) => String(promo.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, items.length === 0 && styles.emptyList]}
        ListEmptyComponent={
          <EmptyState
            icon="pricetag-outline"
            title={tab === 'active' ? t('promo.empty') : t('promo.emptyUsed')}
            // Booking happens on home; during a ride there's nothing to book.
            actionLabel={rideActive ? undefined : t('common.actions.bookRide')}
            onAction={rideActive ? undefined : () => router.dismissAll()}
          />
        }
        refreshControl={refreshControl}
        testID="promo-list"
      />
    );
  }

  return (
    <Screen
      padded={false}
      header={
        <Header
          title={t('promo.title')}
          onBack={() => router.back()}
          backLabel={t('common.a11y.back')}
        />
      }
      testID="promos-screen"
    >
      <View
        style={styles.tabs}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('promo.title')}
      >
        {TABS.map((value) => (
          <Chip
            key={value}
            label={t(`promo.tabs.${value}`)}
            role="radio"
            selected={tab === value}
            onPress={() => setTab(value)}
            testID={`promo-tab-${value}`}
          />
        ))}
      </View>
      {content}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  tabs: {
    flexDirection: 'row',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.sm,
  },
  list: { gap: t.spacing.md, padding: t.spacing.lg },
  emptyList: { flexGrow: 1 },
}));
