import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  tone?: 'brand' | 'success' | 'danger';
  icon?: ComponentProps<typeof Ionicons>['name'];
};

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  tone = 'brand',
  icon,
}: ButtonProps) {
  const theme = useTheme();
  const secondary = variant === 'secondary';
  const solidColor = tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : theme.brand;
  const onSurfaceColor =
    tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : theme.brandOnSurface;
  const contentColor = secondary ? onSurfaceColor : theme.brandText;

  return (
    <Pressable
      style={[
        styles.button,
        secondary
          ? {
              backgroundColor: 'transparent',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: onSurfaceColor,
            }
          : { backgroundColor: solidColor },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={contentColor} /> : null}
          <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  label: {
    fontFamily: Fonts.inter.semiBold,
    fontSize: 16,
  },
});
