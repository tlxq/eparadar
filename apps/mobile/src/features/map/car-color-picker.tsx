import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Avatar } from '@/components/avatar';
import { CAR_COLORS, carColorHex } from '@/features/map/car-colors';
import { useProfile } from '@/features/profile/hooks';
import { useTheme } from '@/hooks/use-theme';

const SWATCH = 36;
const MARKER = 30;
const DARK_CHECK = new Set(['vit', 'gul', 'silver', 'orange', 'gron', 'rosa']);

type CarColorPickerProps = {
  value: string | null;
  onChange: (key: string) => void;
  disabled?: boolean;
};

export function CarColorPicker({ value, onChange, disabled }: CarColorPickerProps) {
  const theme = useTheme();
  const selected = CAR_COLORS.find((color) => color.key === value);
  const { data: profile } = useProfile();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">
            Färg på kartan{selected ? ` · ${selected.label}` : ''}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            Syns som ringen runt dig för dina kompisar.
          </ThemedText>
        </View>
        <View
          accessibilityLabel="Så ser du ut på kartan"
          style={[styles.marker, { borderColor: carColorHex(value) }]}
        >
          <Avatar
            name={profile?.display_name ?? '?'}
            imageUrl={profile?.avatar_url}
            size={MARKER}
          />
        </View>
      </View>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  headerText: { flex: 1, gap: Spacing.one },
  marker: { borderWidth: 3, borderRadius: MARKER, padding: Spacing.half },
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
