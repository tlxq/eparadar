import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { SectionLabel } from '@/components/section-label';
import { ThemedText } from '@/components/themed-text';
import { Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { fetchPosts, POSTS_PAGE_SIZE, type FriendLocation, type Post } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useFriendLocations } from '@/features/map/hooks';
import { useQueryErrorToast } from '@/hooks/use-query-error-toast';
import { PostItem } from '@/features/feed/components/post-item';
import { PostActionsSheet } from '@/features/feed/components/post-actions-sheet';
const ON_MAP_AVATAR = 56;

function OnMapNow({ friends }: { friends: FriendLocation[] }) {
  const theme = useTheme();

  return (
    <View style={styles.onMap}>
      <SectionLabel>På kartan nu</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.onMapRow}
      >
        {friends.map((friend) => (
          <Pressable
            key={friend.user_id}
            accessibilityRole="button"
            accessibilityLabel={`${friend.profile.display_name} är på kartan`}
            onPress={() =>
              router.navigate({ pathname: '/karta', params: { focus: friend.user_id } })
            }
            style={({ pressed }) => [styles.onMapItem, pressed && styles.pressed]}
          >
            <View style={[styles.ring, { borderColor: theme.brand }]}>
              <Avatar
                name={friend.profile.display_name}
                imageUrl={friend.profile.avatar_url}
                size={ON_MAP_AVATAR}
              />
            </View>
            <ThemedText type="caption" numberOfLines={1} style={styles.onMapName}>
              {friend.profile.display_name.split(' ')[0]}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

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
  const tabBarInset = useTabBarInset();
  const [selected, setSelected] = useState<Post | null>(null);
  const { data, isLoading, isError, refetch, isRefetching, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.posts(),
      queryFn: ({ pageParam }) => fetchPosts(pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) =>
        lastPage.length === POSTS_PAGE_SIZE ? pages.length : undefined,
    });
  const posts = useMemo(() => data?.pages.flat() ?? [], [data]);

  const { data: friendLocations } = useFriendLocations();

  useQueryErrorToast(isError, 'Kunde inte ladda flödet.', refetch);

  const onMap = friendLocations ?? [];

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={posts}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostItem post={item} onMore={() => setSelected(item)} />}
          contentContainerStyle={{ paddingBottom: tabBarInset + Spacing.six }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <ScreenHeader title="Flöde" />
              {onMap.length > 0 ? <OnMapNow friends={onMap} /> : null}
            </View>
          }
          ListEmptyComponent={
            isLoading ? (
              <FeedSkeleton />
            ) : isError ? null : (
              <EmptyState
                icon="newspaper-outline"
                title="Inga poster än"
                message="Här ser du poster från dina kompisar. Visa upp kärran eller dela en bild från helgens tur!"
                action={{
                  label: 'Skriv en post',
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
  onMap: { gap: Spacing.two, paddingBottom: Spacing.two },
  onMapRow: { gap: Spacing.three, paddingRight: Spacing.three },
  onMapItem: { alignItems: 'center', gap: Spacing.one, width: ON_MAP_AVATAR + 8 },
  onMapName: { maxWidth: ON_MAP_AVATAR + 8 },
  ring: { borderWidth: 2, borderRadius: (ON_MAP_AVATAR + 8) / 2, padding: 2 },
  pressed: { opacity: 0.7 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  skeleton: { paddingHorizontal: Spacing.three, gap: Spacing.five, paddingTop: Spacing.two },
  skeletonPost: { gap: Spacing.three },
  skeletonLines: { flex: 1, gap: Spacing.two },
});
