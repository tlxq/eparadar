import { useQueryClient } from '@tanstack/react-query';

import { ActionSheet } from '@/components/action-sheet';
import { Common } from '@/constants/strings';
import { deletePost, type Post } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

export function PostActionsSheet({ post, onClose }: { post: Post | null; onClose: () => void }) {
  const queryClient = useQueryClient();

  async function handleDelete(target: Post) {
    const ok = await confirmDestructive({
      title: 'Ta bort inlägget?',
      message: 'Inlägget och dess bild tas bort för alla. Det går inte att ångra.',
      confirmLabel: Common.remove,
    });
    if (!ok) return;
    try {
      await deletePost(target);
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      showToast({ message: 'Inlägget är borttaget.' });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  return (
    <ActionSheet
      visible={!!post}
      title="Ditt inlägg"
      onClose={onClose}
      actions={
        post
          ? [
              {
                label: 'Ta bort inlägg',
                icon: 'trash-outline',
                destructive: true,
                onPress: () => handleDelete(post),
              },
            ]
          : []
      }
    />
  );
}
