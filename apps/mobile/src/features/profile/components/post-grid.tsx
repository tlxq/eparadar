import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { PostItem } from '@/features/feed/components/post-item';
import { usePostActions } from '@/features/feed/components/post-actions-sheet';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/hooks/use-user-id';
import type { Post } from '@/lib/api';

const COLUMNS = 3;
const GAP = Spacing.one;

function useTileSize() {
  const { width } = useWindowDimensions();
  return Math.floor((width - Spacing.three * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
}

export function PostGrid({ posts }: { posts: Post[] }) {
  const theme = useTheme();
  const size = useTileSize();
  const [open, setOpen] = useState<Post | null>(null);

  return (
    <>
      <View style={styles.grid}>
        {posts.map((post) => (
          <Pressable
            key={post.id}
            accessibilityRole="button"
            accessibilityLabel={post.body ? `Post: ${post.body}` : 'Post med bild'}
            onPress={() => setOpen(post)}
            style={({ pressed }) => [
              styles.tile,
              { width: size, height: size, backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}
          >
            {post.image_signed_url ? (
              <Image source={{ uri: post.image_signed_url }} style={StyleSheet.absoluteFill} />
            ) : (
              <ThemedText type="caption" numberOfLines={5} style={styles.tileText}>
                {post.body}
              </ThemedText>
            )}
            {post.car ? (
              <View style={[styles.carBadge, { backgroundColor: theme.scrimSurface }]}>
                <Ionicons name="car-sport" size={10} color={theme.onScrim} />
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
      <PostSheet post={open} onClose={() => setOpen(null)} />
    </>
  );
}

export function PostGridSkeleton() {
  const size = useTileSize();
  return (
    <View style={styles.grid}>
      {Array.from({ length: COLUMNS * 2 }, (_, index) => (
        <Skeleton key={index} width={size} height={size} radius={Radius.md} />
      ))}
    </View>
  );
}

function PostSheet({ post, onClose }: { post: Post | null; onClose: () => void }) {
  const userId = useUserId();
  const actionsFor = usePostActions();
  return (
    <ActionSheet
      visible={!!post}
      onClose={onClose}
      header={post ? <PostItem post={post} /> : null}
      title={post && post.author_id === userId ? 'Din post' : undefined}
      actions={post ? actionsFor(post) : []}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingHorizontal: Spacing.three,
  },
  tile: { borderRadius: Radius.md, overflow: 'hidden', padding: Spacing.two },
  tileText: { flexShrink: 1 },
  carBadge: {
    position: 'absolute',
    right: Spacing.one,
    bottom: Spacing.one,
    width: 18,
    height: 18,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
});
