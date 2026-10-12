import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tile = {
  label: string;
  hint: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  href: Href;
};

const TILES: Tile[] = [
  {
    label: Words.radar,
    hint: 'Hitta folk inom 100 m',
    icon: 'radio-outline',
    href: '/friends/nearby',
  },
  { label: 'Skanna', hint: 'Läs kompisens QR', icon: 'scan-outline', href: '/friends/scan' },
  { label: 'Min kod', hint: 'Låt kompisen skanna', icon: 'qr-code-outline', href: '/friends/code' },
  {
    label: 'Skriv kod',
    hint: 'Sex tecken, typ K7P-2QX',
    icon: 'keypad-outline',
    href: '/friends/enter-code',
  },
];

export function AddTiles() {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {TILES.map((tile) => (
        <Pressable
          key={tile.label}
          accessibilityRole="button"
          accessibilityLabel={`${tile.label}. ${tile.hint}`}
          onPress={() => router.push(tile.href)}
          style={({ pressed }) => [
            styles.tile,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: theme.brand }]}>
            <Ionicons name={tile.icon} size={24} color={theme.brandText} />
          </View>
          <View style={styles.text}>
            <ThemedText type="headline">{tile.label}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
              {tile.hint}
            </ThemedText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    minHeight: 128,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { gap: Spacing.half },
});
