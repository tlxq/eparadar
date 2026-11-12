import { useCallback, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export function useHeaderReveal(threshold: number) {
  const [revealed, setRevealed] = useState(false);
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = event.nativeEvent.contentOffset.y > threshold;
      setRevealed((current) => (current === next ? current : next));
    },
    [threshold],
  );
  return { revealed, onScroll, scrollEventThrottle: 32 };
}
