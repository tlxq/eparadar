import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

type UseRealtimeTableOptions = {
  channelName: string;
  table: string;
  event?: RealtimeEvent;
  filter?: string;
  enabled?: boolean;
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
};

export function useRealtimeTable({
  channelName,
  table,
  event = '*',
  filter,
  enabled = true,
  onChange,
}: UseRealtimeTableOptions) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        filter ? { event, schema: 'public', table, filter } : { event, schema: 'public', table },
        (payload) => onChangeRef.current(payload),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, table, event, filter, enabled]);
}
