import { useEffect, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useMapFilters, type MapLayer } from '@/features/map/use-map-filters';
import { useTheme } from '@/hooks/use-theme';
import { tapHaptic } from '@/lib/haptics';

export const FILTER_ROW_HEIGHT = 36;

type ThemeColor = 'text' | 'accent' | 'brandOnSurface' | 'warning';

const CHIPS: {
  layer: MapLayer;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: ThemeColor;
}[] = [
  { layer: 'friends', label: Words.friends, icon: 'people', color: 'text' },
  { layer: 'ragg', label: Words.ragga, icon: 'sparkles', color: 'accent' },
  { layer: 'meets', label: 'Träffar', icon: 'calendar', color: 'brandOnSurface' },
  { layer: 'warnings', label: 'Varningar', icon: 'warning', color: 'warning' },
];

export function MapFilterChips({ top }: { top: number }) {
  const theme = useTheme();
  const hidden = useMapFilters((state) => state.hidden);
  const toggle = useMapFilters((state) => state.toggle);
  const load = useMapFilters((state) => state.load);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroller, { top }]}
      contentContainerStyle={styles.row}
    >
      {CHIPS.map((chip) => {
        const off = hidden.includes(chip.layer);
        return (
          <Pressable
            key={chip.layer}
            accessibilityRole="switch"
            accessibilityLabel={`Visa ${chip.label.toLowerCase()} på kartan`}
            accessibilityState={{ checked: !off }}
            onPress={() => {
              tapHaptic();
              toggle(chip.layer);
            }}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.backgroundElement, borderColor: theme.separator },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={off ? 'eye-off-outline' : chip.icon}
              size={15}
              color={off ? theme.textSecondary : theme[chip.color]}
            />
            <ThemedText
              type="smallBold"
              themeColor={off ? 'textSecondary' : 'text'}
              style={off && styles.off}
            >
              {chip.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: { position: 'absolute', left: 0, right: 0, flexGrow: 0 },
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    height: FILTER_ROW_HEIGHT,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  pressed: { opacity: 0.8 },
  off: { textDecorationLine: 'line-through' },
});
