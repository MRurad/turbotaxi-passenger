import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { EmptyState, ErrorState, Header, Screen } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { isActivePhase } from '@/features/ride/snapshot';
import { useRideStore } from '@/features/ride/store';
import { makeStyles, useTheme } from '@/theme';

import { TripCard } from '../components/TripCard';
import { TripCardSkeleton } from '../components/TripCardSkeleton';
import { useTripHistory } from '../hooks/useTripHistory';
import type { Trip } from '../types';

const SKELETON_CARDS = 4;
const LOAD_MORE_THRESHOLD = 0.4;

/** My trips: newest first, paged on scroll, pull to refresh. */
export function HistoryScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const history = useTripHistory();
  const rideActive = useRideStore((s) => isActivePhase(s.phase));

  const open = useCallback(
    (rideId: number) =>
      router.push({ pathname: ROUTES.tripDetail, params: { rideId: String(rideId) } }),
    [router],
  );
  const renderItem = useCallback(
    ({ item }: { item: Trip }) => <TripCard trip={item} onPress={open} />,
    [open],
  );

  let content;
  if (history.isLoading) {
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
  } else if (history.isOffline) {
    content = (
      <ErrorState
        icon="cloud-offline-outline"
        title={t('errors.title')}
        message={t('errors.network')}
        retryLabel={t('common.actions.retry')}
        onRetry={history.refetch}
      />
    );
  } else if (history.error && history.trips.length === 0) {
    content = (
      <ErrorState
        title={t('history.loadError')}
        message={t(history.error.messageKey)}
        retryLabel={t('common.actions.retry')}
        onRetry={history.refetch}
      />
    );
  } else {
    // Empty still renders the list, so pull-to-refresh works there too.
    content = (
      <FlatList
        data={history.trips}
        keyExtractor={(trip) => String(trip.rideId)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, history.trips.length === 0 && styles.emptyList]}
        ListEmptyComponent={
          <EmptyState
            icon="car-outline"
            title={t('history.emptyTitle')}
            message={t('history.emptyMessage')}
            // Back to the real home (not a second one on top); nothing to book during a ride.
            actionLabel={rideActive ? undefined : t('common.actions.bookRide')}
            onAction={rideActive ? undefined : () => router.dismissAll()}
          />
        }
        onEndReached={history.loadMore}
        onEndReachedThreshold={LOAD_MORE_THRESHOLD}
        refreshControl={
          <RefreshControl
            refreshing={history.isRefreshing}
            onRefresh={history.refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surfaceElevated}
          />
        }
        ListFooterComponent={
          history.isLoadingMore ? <ActivityIndicator color={colors.primary} /> : null
        }
        testID="history-list"
      />
    );
  }

  return (
    <Screen
      padded={false}
      header={
        <Header
          title={t('history.title')}
          onBack={() => router.back()}
          backLabel={t('common.a11y.back')}
        />
      }
      testID="history-screen"
    >
      {content}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.spacing.md, padding: t.spacing.lg },
  emptyList: { flexGrow: 1 },
}));
