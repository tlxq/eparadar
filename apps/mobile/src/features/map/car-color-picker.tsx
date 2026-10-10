import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { CAR_COLORS } from '@/features/map/car-colors';
import { useTheme } from '@/hooks/use-theme';

const SWATCH = 36;
const DARK_CHECK = new Set(['vit', 'gul', 'silver', 'orange', 'gron', 'rosa']);

type CarColorPickerProps = {
  value: string | null;
  onChange: (key: string) => void;
  disabled?: boolean;
};

export function CarColorPicker({ value, onChange, disabled }: CarColorPickerProps) {
  const theme = useTheme();
  const selected = CAR_COLORS.find((color) => color.key === value);

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Färg{selected ? ` · ${selected.label}` : ''}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        Syns som ringen runt dig på kartan.
      </ThemedText>
      <View style={styles.row} accessibilityRole="radiogroup">
        {CAR_COLORS.map((color) => {
          const isSelected = color.key === value;
          return (
            <Pressable
              key={color.key}
              accessibilityRole="radio"
              accessibilityLabel={color.label}
              accessibilityState={{ selected: isSelected, disabled }}
              disabled={disabled}
              onPress={() => onChange(color.key)}
              hitSlop={4}
              style={({ pressed }) => [
                styles.swatch,
                { backgroundColor: color.hex, borderColor: theme.border },
                isSelected && { borderColor: theme.text, borderWidth: 3 },
                pressed && styles.pressed,
              ]}
            >
              {isSelected ? (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={DARK_CHECK.has(color.key) ? '#0B0E14' : '#FFFFFF'}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.one },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
