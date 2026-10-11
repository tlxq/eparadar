import { useEffect } from 'react';

import { showToast } from '@/store/toast';

export function useQueryErrorToast(isError: boolean, message: string, retry: () => unknown) {
  useEffect(() => {
    if (isError) {
      showToast({
        tone: 'error',
        message,
        action: { label: 'Försök igen', onPress: () => retry() },
      });
    }
  }, [isError, message, retry]);
}
