import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { carLabel } from '@/features/feed/components/post-item';
import { useTheme } from '@/hooks/use-theme';
import { fetchPost } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { SIGNED_URL_REFRESH_MS } from '@/lib/queryClient';

const CARD_WIDTH = 230;

export function SharedPostCard({
  postId,
  onLongPress,
}: {
  postId: string;
  onLongPress: () => void;
}) {
  const theme = useTheme();
  const { data: post, isLoading } = useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => fetchPost(postId),
    staleTime: SIGNED_URL_REFRESH_MS,
    refetchInterval: SIGNED_URL_REFRESH_MS,
  });

  if (isLoading) {
    return <Skeleton width={CARD_WIDTH} height={190} radius={Radius.lg} />;
  }

  if (!post) {
    return (
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={300}
        style={[styles.card, styles.gone, { backgroundColor: theme.backgroundElement }]}
      >
        <Ionicons name="eye-off-outline" size={18} color={theme.textSecondary} />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.goneText}>
          Posten är borta eller syns bara för personens kompisar.
        </ThemedText>
      </Pressable>
    );
  }

  const name = post.author?.display_name ?? 'Okänd användare';
  const car = carLabel(post.car);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Post från ${name}. Tryck för att öppna.`}
      onPress={() => router.push(`/post/${post.id}`)}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      {post.image_signed_url ? (
        <Image source={{ uri: post.image_signed_url }} style={styles.image} />
      ) : null}
      <View style={styles.body}>
        <View style={styles.author}>
          <Avatar name={name} imageUrl={post.author?.avatar_url} size={20} />
          <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
            {name}
          </ThemedText>
        </View>
        {car ? (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {car}
          </ThemedText>
        ) : null}
        {post.body ? (
          <ThemedText type="small" numberOfLines={2}>
            {post.body}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, borderRadius: Radius.lg, overflow: 'hidden' },
  pressed: { opacity: 0.8 },
  image: { width: '100%', aspectRatio: 4 / 3 },
  body: { padding: Spacing.two, gap: Spacing.half },
  author: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  name: { flex: 1 },
  gone: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  goneText: { flex: 1 },
});
