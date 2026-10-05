import { router } from 'expo-router';
import { FlatList, Image, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Fab } from '@/components/fab';
import { ScreenHeader } from '@/components/screen-header';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { fetchPosts, type Post } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

function PostCard({ post }: { post: Post }) {
  const authorName = post.author?.display_name ?? 'Okänd användare';
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar name={authorName} imageUrl={post.author?.avatar_url} size={32} />
        <View style={styles.cardHeaderText}>
          <ThemedText type="smallBold">{authorName}</ThemedText>
          {post.car ? (
            <ThemedText type="small" themeColor="textSecondary">
              {post.car.nickname ?? `${post.car.make} ${post.car.model}`}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <ThemedText>{post.body}</ThemedText>
      {post.image_url ? <Image source={{ uri: post.image_url }} style={styles.postImage} /> : null}
    </ThemedView>
  );
}

export default function FeedScreen() {
  const tabBarInset = useTabBarInset();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.posts(),
    queryFn: fetchPosts,
  });

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Flöde" />
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarInset + Spacing.six }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            !isLoading ? <ThemedText themeColor="textSecondary">Inga inlägg än.</ThemedText> : null
          }
        />
      </SafeAreaView>
      <Fab icon="create-outline" accessibilityLabel="Ny post" onPress={() => router.push('/post/new')} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  list: { gap: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardHeaderText: { gap: Spacing.half },
  postImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: Spacing.two },
});
