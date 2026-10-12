import { useEffect, useState } from 'react';

import { RESEND_COOLDOWN_S } from '@/features/auth/api';
import { getErrorMessage } from '@/lib/errors';
import { showToast } from '@/store/toast';

export function useResend(send: () => Promise<void>, startCoolingDown = true) {
  const [secondsLeft, setSecondsLeft] = useState(startCoolingDown ? RESEND_COOLDOWN_S : 0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function resend() {
    if (sending || secondsLeft > 0) return;
    setSending(true);
    try {
      await send();
      setSecondsLeft(RESEND_COOLDOWN_S);
      showToast({ tone: 'success', message: 'Nytt mejl på väg!' });
    } catch (err) {
      showToast({ tone: 'error', message: getErrorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  const label = secondsLeft > 0 ? `Skicka igen om ${secondsLeft} s` : 'Skicka mejlet igen';

  return { resend, sending, waiting: secondsLeft > 0, label };
}
