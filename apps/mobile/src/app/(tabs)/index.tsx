import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchPosts, type Post } from '@/lib/api';

function PostCard({ post }: { post: Post }) {
  const authorName = post.author?.display_name ?? 'Okänd användare';
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardHeader}>
        <Avatar name={authorName} size={32} />
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
    </ThemedView>
  );
}

export default function FeedScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title">Flöde</ThemedText>
          <Button label="Ny post" icon="add-circle-outline" onPress={() => router.push('/post/new')} />
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
    </ScreenBackground>
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
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardHeaderText: { gap: Spacing.half },
});
