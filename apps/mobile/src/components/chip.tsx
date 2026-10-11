import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  leading?: ReactNode | ((selected: boolean, color: string) => ReactNode);
  tone?: 'brand' | 'accent';
  role?: 'button' | 'radio';
};

export function Chip({
  label,
  selected,
  onPress,
  leading,
  tone = 'brand',
  role = 'button',
}: ChipProps) {
  const theme = useTheme();
  const activeBackground = tone === 'accent' ? theme.accent : theme.brand;
  const activeText = tone === 'accent' ? theme.onAccent : theme.brandText;
  const textColor = selected ? activeText : theme.text;

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? activeBackground : theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      {typeof leading === 'function' ? leading(selected, textColor) : leading}
      <ThemedText type="smallBold" style={{ color: textColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  pressed: { opacity: 0.8 },
});
