import { useEffect } from 'react';

import { showToast } from '@/store/toast';
import { Common } from '@/constants/strings';

export function useQueryErrorToast(isError: boolean, message: string, retry: () => unknown) {
  useEffect(() => {
    if (isError) {
      showToast({
        tone: 'error',
        message,
        action: { label: Common.retry, onPress: () => retry() },
      });
    }
  }, [isError, message, retry]);
}
