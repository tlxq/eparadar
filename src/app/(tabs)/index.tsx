import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchPosts, type Post } from '@/lib/api';

function PostCard({ post }: { post: Post }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{post.author?.display_name ?? 'Okänd användare'}</ThemedText>
      {post.car ? (
        <ThemedText type="small" themeColor="textSecondary">
          {post.car.nickname ?? `${post.car.make} ${post.car.model}`}
        </ThemedText>
      ) : null}
      <ThemedText>{post.body}</ThemedText>
    </ThemedView>
  );
}

export default function FeedScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title">Flöde</ThemedText>
          <Button label="Ny post" onPress={() => router.push('/post/new')} />
        </View>
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            !isLoading ? <ThemedText themeColor="textSecondary">Inga inlägg än.</ThemedText> : null
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  list: { gap: Spacing.two, paddingBottom: Spacing.four },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
});
