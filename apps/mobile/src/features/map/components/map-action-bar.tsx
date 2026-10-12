import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PickerMode = 'none' | 'search' | 'friends';

type MapActionBarProps = {
  bottom: number;
  picker: PickerMode;
  onPicker: (mode: PickerMode) => void;
  onAdd: () => void;
  onLocate: () => void;
  following: boolean;
  locating: boolean;
};

export function MapActionBar({
  bottom,
  picker,
  onPicker,
  onAdd,
  onLocate,
  following,
  locating,
}: MapActionBarProps) {
  const theme = useTheme();
  const toggle = (mode: Exclude<PickerMode, 'none'>) => onPicker(picker === mode ? 'none' : mode);

  return (
    <View
      style={[
        styles.bar,
        { bottom, backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => toggle('search')}
        style={styles.button}
        hitSlop={8}
        accessibilityLabel="Sök kompis"
      >
        <Ionicons name="search" size={22} color={picker === 'search' ? theme.brand : theme.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => toggle('friends')}
        style={styles.button}
        hitSlop={8}
        accessibilityLabel="Kompisar på kartan"
      >
        <Ionicons name="people" size={22} color={picker === 'friends' ? theme.brand : theme.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onAdd}
        style={styles.button}
        hitSlop={8}
        accessibilityLabel={Words.placeOnMap}
      >
        <Ionicons name="add-circle" size={26} color={theme.brand} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onLocate}
        style={styles.button}
        hitSlop={8}
        accessibilityLabel={following ? 'Följer dig' : 'Följ mig på kartan'}
        accessibilityState={{ selected: following }}
      >
        <Ionicons
          name={
            locating && !following
              ? 'ellipsis-horizontal'
              : following
                ? 'navigate'
                : 'locate-outline'
          }
          size={22}
          color={following ? theme.brand : theme.text}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  button: { alignItems: 'center', justifyContent: 'center' },
});
