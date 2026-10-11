import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS !== 'web';

export function tapHaptic() {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function pressHaptic() {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

export function successHaptic() {
  if (enabled)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
