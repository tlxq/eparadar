import { useQuery } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import {
  conversationAvatarUrl,
  conversationTitle,
  groupAvatarUrl,
  type Conversation,
} from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const SIGNED_URL_STALE_MS = 50 * 60 * 1000;

type ConversationAvatarProps = {
  conversation: Conversation;
  myUserId: string;
  size?: number;
};

export function ConversationAvatar({ conversation, myUserId, size }: ConversationAvatarProps) {
  const groupPath = conversation.is_group ? conversation.avatar_path : null;

  const { data: signedUrl } = useQuery({
    queryKey: queryKeys.groupAvatar(groupPath),
    queryFn: () => groupAvatarUrl(groupPath!),
    enabled: !!groupPath,
    staleTime: SIGNED_URL_STALE_MS,
  });

  const imageUrl = groupPath ? signedUrl : conversationAvatarUrl(conversation, myUserId);

  return (
    <Avatar name={conversationTitle(conversation, myUserId)} imageUrl={imageUrl} size={size} />
  );
}
