import { useEffect } from 'react';
import * as Linking from 'expo-linking';

import { authParams, handleAuthLink } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/auth';
import { showToast } from '@/store/toast';

const handled = new Set<string>();

async function onUrl(url: string | null) {
  if (!url || handled.has(url)) return;
  const params = authParams(url);
  if (!params.access_token && !params.error_code && !params.error) return;
  handled.add(url);
  useAuthStore.getState().setLinkPending(true);
  try {
    const result = await handleAuthLink(url);
    if (result?.kind === 'error') {
      showToast({
        tone: 'error',
        message: getErrorMessage({ code: result.code ?? 'otp_expired', message: '' }),
      });
    } else if (result?.kind === 'session' && result.type === 'signup') {
      showToast({ tone: 'success', message: 'E-posten är bekräftad. Välkommen!' });
    }
  } finally {
    useAuthStore.getState().setLinkPending(false);
  }
}

export function useAuthLinks() {
  useEffect(() => {
    Linking.getInitialURL().then(onUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => onUrl(url));
    return () => subscription.remove();
  }, []);
}
