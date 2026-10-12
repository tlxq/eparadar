import { useCallback } from 'react';
import {
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';

import { addPostReaction, fetchMapPosts, removePostReaction } from '@/features/feed/api';
import { useProfile } from '@/features/profile/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { type Post, type PostReaction } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { pressHaptic } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-keys';
import { SIGNED_URL_REFRESH_MS } from '@/lib/queryClient';
import { showToast, showUndoToast } from '@/store/toast';

type PostCache = Post | Post[] | InfiniteData<Post[]> | number | null | undefined;

function patchPosts(queryClient: QueryClient, postId: string, patch: (post: Post) => Post) {
  const apply = (post: Post) => (post.id === postId ? patch(post) : post);
  queryClient.setQueriesData<PostCache>({ queryKey: queryKeys.posts() }, (data) => {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(apply);
    if ('pages' in data) return { ...data, pages: data.pages.map((page) => page.map(apply)) };
    if ('reactions' in data) return apply(data);
    return data;
  });
}

export function usePostReaction() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const { data: profile } = useProfile();

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.posts() }),
    [queryClient],
  );

  return useCallback(
    async (post: Post, emoji: string) => {
      if (!userId) return;
      pressHaptic();
      const mine = post.reactions.some((r) => r.user_id === userId && r.emoji === emoji);
      if (mine) {
        patchPosts(queryClient, post.id, (p) => ({
          ...p,
          reactions: p.reactions.filter((r) => !(r.user_id === userId && r.emoji === emoji)),
        }));
        showUndoToast({
          message: `Din ${emoji} är borttagen.`,
          onUndo: refresh,
          onCommit: async () => {
            try {
              await removePostReaction(post.id, userId, emoji);
            } catch (error) {
              showToast({ tone: 'error', message: getErrorMessage(error) });
            }
            refresh();
          },
        });
        return;
      }
      const added: PostReaction = {
        user_id: userId,
        emoji,
        profile: profile
          ? { id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url }
          : null,
      };
      patchPosts(queryClient, post.id, (p) => ({ ...p, reactions: [...p.reactions, added] }));
      try {
        await addPostReaction(post.id, userId, emoji);
      } catch (error) {
        showToast({ tone: 'error', message: getErrorMessage(error) });
        refresh();
      }
    },
    [queryClient, userId, profile, refresh],
  );
}

export function useMapPosts(enabled = true) {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.mapPosts(),
    queryFn: fetchMapPosts,
    enabled: !!userId && enabled,
    refetchInterval: SIGNED_URL_REFRESH_MS,
  });
}
