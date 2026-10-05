import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToastStore } from '@/store/toast';

const DURATION_MS = 4000;

export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismiss);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const timer = setTimeout(dismiss, toast.action ? DURATION_MS * 1.5 : DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss, progress]);

  if (!toast) return null;

  const toneColor =
    toast.tone === 'error'
      ? theme.danger
      : toast.tone === 'success'
        ? theme.success
        : theme.brandOnSurface;
  const icon =
    toast.tone === 'error'
      ? 'alert-circle'
      : toast.tone === 'success'
        ? 'checkmark-circle'
        : 'information-circle';

  return (
    <View pointerEvents="box-none" style={[styles.layer, { top: insets.top + Spacing.two }]}>
      <Animated.View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          {
            backgroundColor: theme.backgroundSelected,
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
            ],
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={toneColor} />
        <ThemedText type="small" style={styles.message}>
          {toast.message}
        </ThemedText>
        {toast.action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => {
              toast.action?.onPress();
              dismiss();
            }}
          >
            <ThemedText type="smallBold" themeColor="brandOnSurface">
              {toast.action.label}
            </ThemedText>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
  },
  message: { flex: 1 },
});
