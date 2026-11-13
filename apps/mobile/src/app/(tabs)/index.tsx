import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Words, loadError } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { fetchPosts, POSTS_PAGE_SIZE, type Post } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useFriendLocations } from '@/features/map/hooks';
import { ErrorState } from '@/components/error-state';
import { useQueryErrorToast } from '@/hooks/use-query-error-toast';
import { PostItem } from '@/features/feed/components/post-item';
import { PostActionsSheet } from '@/features/feed/components/post-actions-sheet';
import { OnMapRow } from '@/features/feed/components/on-map-row';
import { EveningCard } from '@/features/feed/components/evening-card';
import { useFriends } from '@/features/friends/hooks';
import { SIGNED_URL_REFRESH_MS } from '@/lib/queryClient';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
function FeedSkeleton() {
  return (
    <View style={styles.skeleton}>
      {[0, 1].map((key) => (
        <View key={key} style={styles.skeletonPost}>
          <View style={styles.postHeader}>
            <Skeleton width={40} height={40} radius={20} />
            <View style={styles.skeletonLines}>
              <Skeleton width="45%" />
              <Skeleton width="30%" />
            </View>
          </View>
          <Skeleton width="85%" />
          <Skeleton height={220} radius={Radius.lg} />
        </View>
      ))}
    </View>
  );
}

export default function FeedScreen() {
  const theme = useTheme();
  const tabBarInset = useTabBarInset();
  const [selected, setSelected] = useState<Post | null>(null);
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.posts(),
      queryFn: ({ pageParam }) => fetchPosts(pageParam),
      refetchInterval: SIGNED_URL_REFRESH_MS,
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) =>
        lastPage.length === POSTS_PAGE_SIZE ? pages.length : undefined,
    });
  const posts = useMemo(() => data?.pages.flat() ?? [], [data]);

  const { data: friendLocations } = useFriendLocations();
  const { data: friends, isLoading: friendsLoading } = useFriends();
  const hasFriends = (friends?.length ?? 0) > 0;

  const pull = usePullRefresh(refetch);

  useQueryErrorToast(isError && posts.length > 0, 'Kunde inte ladda flödet.', refetch);

  const onMap = friendLocations ?? [];

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={posts}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                accessibilityLabel="Laddar fler poster"
                color={theme.textSecondary}
                style={styles.footerSpinner}
              />
            ) : null
          }
          onEndReachedThreshold={0.5}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostItem post={item} openable onMore={() => setSelected(item)} />
          )}
          contentContainerStyle={{ paddingBottom: tabBarInset + Spacing.six }}
          refreshControl={
            <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
          }
          ListHeaderComponent={
            <>
              <ScreenHeader root title="Flöde" />
              <View style={styles.headerBlock}>
                {onMap.length > 0 ? <OnMapRow friends={onMap} /> : null}
                {hasFriends ? <EveningCard friendsOut={onMap} /> : null}
              </View>
            </>
          }
          ListEmptyComponent={
            isLoading || friendsLoading ? (
              <FeedSkeleton />
            ) : isError ? (
              <ErrorState message={loadError('Flödet')} onRetry={refetch} />
            ) : !hasFriends ? (
              <EmptyState
                icon="people-outline"
                title="Flödet är tomt utan kompisar"
                message="Här ser du poster från dina kompisar. Lägg till några så fylls det på!"
                action={{
                  label: Words.addFriend,
                  icon: 'person-add-outline',
                  onPress: () => router.push('/friends/add'),
                }}
              />
            ) : (
              <EmptyState
                icon="newspaper-outline"
                title="Inga poster än"
                message="Dina kompisar har inte postat något än. Visa upp kärran eller dela en bild från helgens tur!"
                action={{
                  label: Words.postSomething,
                  icon: 'create-outline',
                  onPress: () => router.push('/post/new'),
                }}
              />
            )
          }
        />
      </SafeAreaView>
      <PostActionsSheet post={selected} onClose={() => setSelected(null)} />
      <Fab
        icon="create-outline"
        accessibilityLabel={Words.newPost}
        onPress={() => router.push('/post/new')}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerBlock: { paddingHorizontal: Spacing.three },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  skeleton: { paddingHorizontal: Spacing.three, gap: Spacing.five, paddingTop: Spacing.two },
  skeletonPost: { gap: Spacing.three },
  skeletonLines: { flex: 1, gap: Spacing.two },
  footerSpinner: { paddingVertical: Spacing.four },
});
