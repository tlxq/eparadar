import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/hooks/use-user-id';
import { setLocationSharing } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { enableLocationSharing } from '@/lib/location-sharing';
import { stopLocationSharing } from '@/lib/location-task';
import { queryKeys } from '@/lib/query-keys';

export function useSharingToggle() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function setSharing(value: boolean): Promise<string | null> {
    if (!userId) return null;
    setBusy(true);
    try {
      if (value) {
        const result = await enableLocationSharing(userId);
        if (!result.ok) return result.reason;
      } else {
        await stopLocationSharing();
        await setLocationSharing(userId, false);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
      return null;
    } catch (error) {
      return getErrorMessage(error);
    } finally {
      setBusy(false);
    }
  }

  return { setSharing, busy };
}
