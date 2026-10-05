import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const FALLBACK_COLORS = [
  '#2F6FED',
  '#7C3AED',
  '#C2410C',
  '#0F766E',
  '#BE185D',
  '#4338CA',
  '#B45309',
  '#15803D',
];

function colorFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

type AvatarProps = {
  name: string;
  size?: number;
  imageUrl?: string | null;
};

export function Avatar({ name, size = 36, imageUrl }: AvatarProps) {
  const theme = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorFor(name.trim() || '?'),
        },
      ]}
    >
      <ThemedText
        type="smallBold"
        style={{ fontSize: size * 0.42, lineHeight: size * 0.5, color: theme.brandText }}
      >
        {initial}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
