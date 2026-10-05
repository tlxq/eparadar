import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  onPress: () => void;
  variant?: 'surface' | 'brand' | 'plain';
  size?: number;
  disabled?: boolean;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'surface',
  size = 40,
  disabled,
}: IconButtonProps) {
  const theme = useTheme();
  const backgroundColor =
    variant === 'brand'
      ? theme.brand
      : variant === 'surface'
        ? theme.backgroundElement
        : 'transparent';
  const color = variant === 'brand' ? theme.brandText : theme.text;
  const slop = Math.max(0, (44 - size) / 2);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={slop}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.4 },
});
