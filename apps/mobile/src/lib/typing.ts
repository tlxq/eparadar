import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { useTypingStore } from '@/store/typing';

const SEND_INTERVAL_MS = 2000;
const channels = new Map<string, RealtimeChannel>();
const lastSent = new Map<string, number>();

type TypingPayload = { userId: string; name: string; stopped?: boolean };

export function subscribeTyping(conversationId: string): () => void {
  if (channels.has(conversationId)) return () => undefined;

  const channel = supabase
    .channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      const { userId, name, stopped } = payload as TypingPayload;
      const store = useTypingStore.getState();
      if (stopped) store.clear(conversationId, userId);
      else store.mark(conversationId, userId, name);
    })
    .subscribe();

  channels.set(conversationId, channel);
  return () => {
    channels.delete(conversationId);
    supabase.removeChannel(channel);
  };
}

export function sendTyping(conversationId: string, userId: string, name: string) {
  const channel = channels.get(conversationId);
  const now = Date.now();
  if (!channel || now - (lastSent.get(conversationId) ?? 0) < SEND_INTERVAL_MS) return;
  lastSent.set(conversationId, now);
  channel.send({ type: 'broadcast', event: 'typing', payload: { userId, name } });
}

export function sendStoppedTyping(conversationId: string, userId: string, name: string) {
  const channel = channels.get(conversationId);
  lastSent.delete(conversationId);
  channel?.send({
    type: 'broadcast',
    event: 'typing',
    payload: { userId, name, stopped: true },
  });
}
