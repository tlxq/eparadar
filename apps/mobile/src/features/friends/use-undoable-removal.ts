import { useQueryClient } from '@tanstack/react-query';

import { usePendingRemovals } from '@/store/pending-removals';
import { showToast, showUndoToast } from '@/store/toast';

export function useUndoableRemoval(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();

  return function removeWithUndo({
    id,
    message,
    commit,
    errorMessage,
  }: {
    id: string;
    message: string;
    commit: () => Promise<void>;
    errorMessage: string;
  }) {
    const { hide, show } = usePendingRemovals.getState();
    hide(id);
    showUndoToast({
      message,
      onUndo: () => show(id),
      onCommit: async () => {
        try {
          await commit();
          await queryClient.invalidateQueries({ queryKey });
        } catch {
          showToast({ tone: 'error', message: errorMessage });
        } finally {
          show(id);
        }
      },
    });
  };
}
