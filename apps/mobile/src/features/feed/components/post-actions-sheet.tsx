import { useQueryClient } from '@tanstack/react-query';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Common } from '@/constants/strings';
import { deletePost, type Post } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { openSharePost } from '@/store/share-post';
import { showToast } from '@/store/toast';
import { openReport } from '@/store/report-sheet';
import { useBlockPerson } from '@/features/moderation/use-block-person';
import { useUserId } from '@/hooks/use-user-id';

export function usePostActions() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  const blockPerson = useBlockPerson();

  async function handleDelete(target: Post) {
    const ok = await confirmDestructive({
      title: 'Ta bort posten?',
      message: 'Posten och dess bild tas bort för alla. Det går inte att ångra.',
      confirmLabel: Common.remove,
    });
    if (!ok) return;
    try {
      await deletePost(target);
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      showToast({ message: 'Posten är borttagen.' });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  function actionsFor(target: Post): SheetAction[] {
    const share: SheetAction = {
      label: 'Skicka i chatt',
      icon: 'paper-plane-outline',
      onPress: () => openSharePost(target.id),
    };
    if (target.author_id === userId) {
      return [
        share,
        {
          label: 'Ta bort post',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => handleDelete(target),
        },
      ];
    }
    const name = target.author?.display_name ?? 'personen';
    return [
      share,
      {
        label: 'Rapportera post',
        icon: 'flag-outline',
        onPress: () => openReport({ type: 'post', id: target.id, userId: target.author_id, name }),
      },
      {
        label: `${Common.block} ${name}`,
        icon: 'ban-outline',
        destructive: true,
        onPress: () => blockPerson(target.author_id, name),
      },
    ];
  }

  return actionsFor;
}

export function PostActionsSheet({ post, onClose }: { post: Post | null; onClose: () => void }) {
  const userId = useUserId();
  const actionsFor = usePostActions();
  return (
    <ActionSheet
      visible={!!post}
      title={post && post.author_id === userId ? 'Din post' : 'Post'}
      onClose={onClose}
      actions={post ? actionsFor(post) : []}
    />
  );
}
