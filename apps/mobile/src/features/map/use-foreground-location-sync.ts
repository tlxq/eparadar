import { useEffect, useRef } from 'react';

import { upsertLocation } from '@/lib/api';

const SYNC_INTERVAL_MS = 30000;

type ForegroundSyncInput = {
  userId: string | null | undefined;
  enabled: boolean;
  position: { lat: number; lng: number } | null;
  motion: { moving: boolean; heading: number | null };
};

export function useForegroundLocationSync({
  userId,
  enabled,
  position,
  motion,
}: ForegroundSyncInput) {
  const lastSent = useRef(0);

  useEffect(() => {
    if (!userId || !enabled || !position) return;
    const now = Date.now();
    if (now - lastSent.current < SYNC_INTERVAL_MS) return;
    lastSent.current = now;
    upsertLocation({ userId, lat: position.lat, lng: position.lng, ...motion }).catch(
      () => undefined,
    );
  }, [userId, enabled, position, motion]);
}
