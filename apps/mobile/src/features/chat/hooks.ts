import { useQuery } from '@tanstack/react-query';

import { useUserId } from '@/hooks/use-user-id';
import { fetchConversation, fetchConversations } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useConversations() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.conversations(userId),
    queryFn: fetchConversations,
    enabled: !!userId,
  });
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.conversation(conversationId),
    queryFn: () => fetchConversation(conversationId!),
    enabled: !!conversationId,
  });
}
