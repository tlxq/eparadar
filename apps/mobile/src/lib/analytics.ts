import type { Json } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export function trackEvent(eventName: string, props: Record<string, Json> = {}): void {
  const userId = useAuthStore.getState().session?.user.id ?? null;
  supabase
    .from('analytics_events')
    .insert({ user_id: userId, event_name: eventName, props })
    .then(({ error }) => {
      if (error) {
        console.warn('trackEvent failed', eventName, error);
      }
    });
}
