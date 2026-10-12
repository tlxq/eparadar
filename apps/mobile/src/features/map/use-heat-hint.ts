import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HEAT_HINT_KEY = 'eparadar.map.heatHintSeen';

export function useHeatHint() {
  const [visible, setVisible] = useState(false);

  const show = useCallback(async () => {
    try {
      if (await AsyncStorage.getItem(HEAT_HINT_KEY)) return;
      await AsyncStorage.setItem(HEAT_HINT_KEY, '1');
    } catch {
      return;
    }
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => setVisible(false), []);

  return { visible, show, dismiss };
}
