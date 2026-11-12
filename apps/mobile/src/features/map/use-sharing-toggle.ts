import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';

import { useUserId } from '@/hooks/use-user-id';
import { setLocationSharing } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { enableLocationSharing } from '@/lib/location-sharing';
import { stopLocationSharing } from '@/lib/location-task';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

type SharingFailure = { message: string; blocked: boolean; cancelled: boolean };

export function showSharingFailure(failure: SharingFailure) {
  showToast({
    tone: failure.cancelled ? 'info' : 'error',
    message: failure.message,
    action: failure.blocked
      ? { label: 'Öppna inställningar', onPress: () => Linking.openSettings() }
      : undefined,
  });
}

export function useSharingToggle() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function setSharing(value: boolean): Promise<SharingFailure | null> {
    if (!userId) return null;
    setBusy(true);
    try {
      if (value) {
        const result = await enableLocationSharing(userId);
        if (!result.ok) {
          return {
            message: result.reason,
            blocked: result.blocked,
            cancelled: result.cancelled,
          };
        }
      } else {
        await stopLocationSharing();
        await setLocationSharing(userId, false);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
      return null;
    } catch (error) {
      return { message: getErrorMessage(error), blocked: false, cancelled: false };
    } finally {
      setBusy(false);
    }
  }

  return { setSharing, busy };
}
