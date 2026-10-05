import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

export const TAB_BAR_HEIGHT = 64;

export function useTabBarOffset() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, Spacing.three);
}

export function useTabBarInset() {
  return useTabBarOffset() + TAB_BAR_HEIGHT + Spacing.three;
}
