import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Post } from '@/lib/api';
import { formatPostAge } from '@/lib/relative-time';
import { openPerson } from '@/store/person-sheet';

export function PostItem({ post, onMore }: { post: Post; onMore?: () => void }) {
  const theme = useTheme();
  const authorName = post.author?.display_name ?? 'Okänd användare';
  const carLabel = post.car ? (post.car.nickname ?? `${post.car.make} ${post.car.model}`) : null;

  return (
    <View style={[styles.post, { borderBottomColor: theme.separator }]}>
      <View style={styles.postHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Visa ${authorName}`}
          disabled={!post.author}
          onPress={() => post.author && openPerson(post.author.id)}
          style={({ pressed }) => [styles.postAuthor, pressed && styles.pressed]}
        >
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
        </Pressable>
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

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  post: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  postAuthor: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
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
});
