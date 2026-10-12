import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/hooks/use-user-id';
import { createConversation } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { maybeRequestNotificationPermission } from '@/lib/push-notifications';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

export function useStartChat() {
  const myUserId = useUserId();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const startChat = useCallback(
    async (personId: string, options?: { replace?: boolean }) => {
      setBusy(true);
      try {
        const conversationId = await createConversation({ otherUserIds: [personId] });
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations(myUserId) });
        if (options?.replace) router.replace(`/chat/${conversationId}`);
        else router.navigate(`/chat/${conversationId}`);
        if (myUserId) maybeRequestNotificationPermission(myUserId, 'chat');
      } catch (error) {
        showToast({ tone: 'error', message: getErrorMessage(error) });
      } finally {
        setBusy(false);
      }
    },
    [myUserId, queryClient],
  );

  return { startChat, busy };
}
