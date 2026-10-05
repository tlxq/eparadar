import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  tone?: 'brand' | 'success' | 'danger';
  size?: 'md' | 'sm';
  icon?: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  tone = 'brand',
  size = 'md',
  icon,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const solidColor =
    tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : theme.brand;
  const onSurfaceColor =
    tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : theme.brandOnSurface;
  const contentColor = variant === 'primary' ? theme.brandText : onSurfaceColor;
  const backgroundColor =
    variant === 'primary'
      ? solidColor
      : variant === 'secondary'
        ? theme.backgroundElement
        : 'transparent';
  const small = size === 'sm';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      hitSlop={small ? 4 : 0}
      style={({ pressed }) => [
        styles.button,
        small ? styles.small : styles.medium,
        { backgroundColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={contentColor} /> : null}
          <Text style={[styles.label, small && styles.smallLabel, { color: contentColor }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medium: {
    minHeight: 48,
    paddingHorizontal: Spacing.four,
  },
  small: {
    minHeight: 36,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    fontFamily: Fonts.inter.bold,
    fontSize: 16,
  },
  smallLabel: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 14,
  },
});
