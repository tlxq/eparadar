import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { fetchFriendLocations, fetchPosts, type FriendLocation, type Post } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { formatPostAge } from '@/lib/relative-time';
import { showToast } from '@/store/toast';
import { useAuthStore } from '@/store/auth';

const ON_MAP_AVATAR = 56;

function OnMapNow({ friends }: { friends: FriendLocation[] }) {
  const theme = useTheme();

  return (
    <View style={styles.onMap}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
        PÅ KARTAN NU
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.onMapRow}>
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

function PostItem({ post }: { post: Post }) {
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
  const userId = useAuthStore((state) => state.session?.user.id);
  const tabBarInset = useTabBarInset();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.posts(),
    queryFn: fetchPosts,
  });

  const { data: friendLocations } = useQuery({
    queryKey: queryKeys.friendLocations(userId),
    queryFn: () => fetchFriendLocations(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (isError) {
      showToast({
        tone: 'error',
        message: 'Kunde inte ladda flödet.',
        action: { label: 'Försök igen', onPress: () => refetch() },
      });
    }
  }, [isError, refetch]);

  const onMap = friendLocations ?? [];

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostItem post={item} />}
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
                message="Visa upp bilen, fråga om en träff eller dela en bild från helgens tur."
                action={{ label: 'Skriv ett inlägg', icon: 'create-outline', onPress: () => router.push('/post/new') }}
              />
            )
          }
        />
      </SafeAreaView>
      <Fab icon="create-outline" accessibilityLabel="Ny post" onPress={() => router.push('/post/new')} />
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
