import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

type CarPhotoProps = {
  size?: number;
  imageUrl?: string | null;
};

export function CarPhoto({ size = 40, imageUrl }: CarPhotoProps) {
  const theme = useTheme();
  const radius = size * 0.25;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.box, { width: size, height: size, borderRadius: radius }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: radius, backgroundColor: theme.backgroundSelected },
      ]}
    >
      <Ionicons name="car-sport-outline" size={size * 0.55} color={theme.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
