import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { ActionSheet } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { IconButton } from '@/components/icon-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { deletePost, fetchPosts, POSTS_PAGE_SIZE, type FriendLocation, type Post } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { formatPostAge } from '@/lib/relative-time';
import { showToast } from '@/store/toast';
import { useFriendLocations } from '@/features/map/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { useQueryErrorToast } from '@/hooks/use-query-error-toast';

const ON_MAP_AVATAR = 56;

function OnMapNow({ friends }: { friends: FriendLocation[] }) {
  const theme = useTheme();

  return (
    <View style={styles.onMap}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
        PÅ KARTAN NU
      </ThemedText>
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
            onPress={() => router.push('/karta')}
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

function PostItem({ post, onMore }: { post: Post; onMore?: () => void }) {
  const theme = useTheme();
  const authorName = post.author?.display_name ?? 'Okänd användare';
  const carLabel = post.car ? (post.car.nickname ?? `${post.car.make} ${post.car.model}`) : null;

  return (
    <View style={[styles.post, { borderBottomColor: theme.separator }]}>
      <View style={styles.postHeader}>
        <Avatar name={authorName} imageUrl={post.author?.avatar_url} size={40} />
        <View style={styles.postHeaderText}>
          <ThemedText type="headline" numberOfLines={1}>
            {authorName}
          </ThemedText>
          {carLabel ? (
            <View style={[styles.carChip, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="car-sport" size={12} color={theme.textSecondary} />
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {carLabel}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatPostAge(post.created_at)}
        </ThemedText>
        {onMore ? (
          <IconButton
            icon="ellipsis-horizontal"
            variant="plain"
            size={32}
            accessibilityLabel="Fler val för inlägget"
            onPress={onMore}
          />
        ) : null}
      </View>
      {post.body ? <ThemedText>{post.body}</ThemedText> : null}
      {post.image_url ? (
        <Image
          source={{ uri: post.image_url }}
          style={[styles.postImage, { backgroundColor: theme.backgroundElement }]}
          accessibilityLabel={`Bild från ${authorName}`}
        />
      ) : null}
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
  const userId = useUserId();
  const tabBarInset = useTabBarInset();
  const queryClient = useQueryClient();
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

  async function handleDelete(post: Post) {
    const ok = await confirmDestructive({
      title: 'Ta bort inlägget?',
      message: 'Inlägget och dess bild tas bort för alla. Det går inte att ångra.',
      confirmLabel: 'Ta bort',
    });
    if (!ok) return;
    try {
      await deletePost(post);
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      showToast({ message: 'Inlägget är borttaget.' });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

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
          renderItem={({ item }) => (
            <PostItem
              post={item}
              onMore={item.author_id === userId ? () => setSelected(item) : undefined}
            />
          )}
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
                title="Inga inlägg än"
                message="Här ser du inlägg från dina vänner. Visa upp bilen eller dela en bild från helgens tur."
                action={{
                  label: 'Skriv ett inlägg',
                  icon: 'create-outline',
                  onPress: () => router.push('/post/new'),
                }}
              />
            )
          }
        />
      </SafeAreaView>
      <ActionSheet
        visible={!!selected}
        title="Ditt inlägg"
        onClose={() => setSelected(null)}
        actions={
          selected
            ? [
                {
                  label: 'Ta bort inlägg',
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: () => handleDelete(selected),
                },
              ]
            : []
        }
      />
      <Fab
        icon="create-outline"
        accessibilityLabel="Ny post"
        onPress={() => router.push('/post/new')}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerBlock: { paddingHorizontal: Spacing.three },
  sectionLabel: { letterSpacing: 0.6 },
  onMap: { gap: Spacing.two, paddingBottom: Spacing.two },
  onMapRow: { gap: Spacing.three, paddingRight: Spacing.three },
  onMapItem: { alignItems: 'center', gap: Spacing.one, width: ON_MAP_AVATAR + 8 },
  onMapName: { maxWidth: ON_MAP_AVATAR + 8 },
  ring: { borderWidth: 2, borderRadius: (ON_MAP_AVATAR + 8) / 2, padding: 2 },
  pressed: { opacity: 0.7 },
  post: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  postHeaderText: { flex: 1, gap: Spacing.half, alignItems: 'flex-start' },
  carChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    maxWidth: '100%',
  },
  postImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.lg },
  skeleton: { paddingHorizontal: Spacing.three, gap: Spacing.five, paddingTop: Spacing.two },
  skeletonPost: { gap: Spacing.three },
  skeletonLines: { flex: 1, gap: Spacing.two },
});
