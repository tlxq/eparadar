import { useEffect, useState } from 'react';

export const MAP_LOAD_TIMEOUT_MS = 15000;

export function useMapLoadTimeout(
  ready: boolean,
  attempt: number,
  timeoutMs = MAP_LOAD_TIMEOUT_MS,
) {
  const [timedOutAttempt, setTimedOutAttempt] = useState<number | null>(null);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setTimedOutAttempt(attempt), timeoutMs);
    return () => clearTimeout(timer);
  }, [ready, attempt, timeoutMs]);

  return !ready && timedOutAttempt === attempt;
}
