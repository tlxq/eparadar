import type { Conversation, ConversationMember } from '@/lib/api';

function time(iso: string): number {
  return new Date(iso).getTime();
}

export function lastActivity(conversation: Conversation): number {
  return time(conversation.messages?.[0]?.created_at ?? conversation.created_at);
}

export function isUnread(conversation: Conversation, myUserId: string): boolean {
  const last = conversation.messages?.[0];
  if (!last || last.sender_id === myUserId) return false;
  const me = conversation.conversation_members.find((member) => member.user_id === myUserId);
  return !me?.last_read_at || time(me.last_read_at) < time(last.created_at);
}

export function readersOf(
  conversation: Conversation,
  message: { created_at: string; sender_id: string },
  myUserId: string,
): ConversationMember[] {
  return conversation.conversation_members.filter(
    (member) =>
      member.user_id !== myUserId &&
      member.user_id !== message.sender_id &&
      (!member.added_at || time(member.added_at) <= time(message.created_at)) &&
      !!member.last_read_at &&
      time(member.last_read_at) >= time(message.created_at),
  );
}

export function isMuted(conversation: Conversation, now = Date.now()): boolean {
  if (!conversation.muted_until) return false;
  return conversation.muted_until === 'infinity' || time(conversation.muted_until) > now;
}
