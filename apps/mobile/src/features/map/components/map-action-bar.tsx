import type { ComponentProps, RefObject } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DropdownMenu, useDropdown, type MenuItem } from '@/components/dropdown-menu';
import { ThemedText } from '@/components/themed-text';
import { Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MapActionBarProps = {
  bottom: number;
  ghost: boolean;
  ghostBusy: boolean;
  onSearch: () => void;
  onFriendList: () => void;
  onToggleGhost: () => void;
  onAddRagga: () => void;
  onAddWarning: () => void;
  onAddMeet: () => void;
  onLocate: () => void;
  following: boolean;
  locating: boolean;
};

type BarButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  accessibilityLabel: string;
  expanded?: boolean;
  selected?: boolean;
  anchorRef?: RefObject<View | null>;
  onPress: () => void;
};

function BarButton({
  icon,
  label,
  color,
  accessibilityLabel,
  expanded,
  selected,
  anchorRef,
  onPress,
}: BarButtonProps) {
  return (
    <View ref={anchorRef} collapsable={false} style={styles.slot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded, selected }}
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name={icon} size={24} color={color} />
        <ThemedText type="caption" style={{ color }} numberOfLines={1}>
          {label}
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function MapActionBar({
  bottom,
  ghost,
  ghostBusy,
  onSearch,
  onFriendList,
  onToggleGhost,
  onAddRagga,
  onAddWarning,
  onAddMeet,
  onLocate,
  following,
  locating,
}: MapActionBarProps) {
  const theme = useTheme();
  const people = useDropdown();
  const add = useDropdown();

  const peopleItems: MenuItem[] = [
    { label: 'Sök kompis', icon: 'search-outline', onPress: onSearch },
    {
      label: 'Kompislista',
      icon: 'people-outline',
      hint: 'Alla som delar sin plats just nu',
      onPress: onFriendList,
    },
    {
      label: ghost ? 'Stäng av spökläge' : 'Slå på spökläge',
      icon: ghost ? 'eye-outline' : 'eye-off-outline',
      hint: ghost ? 'Kompisarna ser dig igen' : 'Kompisarna slutar se dig direkt',
      disabled: ghostBusy,
      onPress: onToggleGhost,
    },
  ];

  const addItems: MenuItem[] = [
    {
      label: `${Words.ragga} där jag är`,
      icon: 'sparkles-outline',
      hint: 'Eller håll in var som helst på kartan',
      onPress: onAddRagga,
    },
    { label: `${Words.warning} där jag är`, icon: 'warning-outline', onPress: onAddWarning },
    {
      label: `${Words.meet} på kartan`,
      icon: 'calendar-outline',
      hint: 'Du väljer platsen själv',
      onPress: onAddMeet,
    },
  ];

  return (
    <>
      <View
        style={[
          styles.bar,
          { bottom, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        <BarButton
          anchorRef={people.ref}
          icon={ghost ? 'eye-off' : 'people'}
          label={ghost ? 'Spökläge' : Words.friends}
          color={people.anchor ? theme.brandOnSurface : theme.text}
          accessibilityLabel="Kompisar, sök och spökläge"
          expanded={!!people.anchor}
          onPress={people.open}
        />
        <BarButton
          anchorRef={add.ref}
          icon="add-circle"
          label={Words.place}
          color={theme.brandOnSurface}
          accessibilityLabel={Words.placeOnMap}
          expanded={!!add.anchor}
          onPress={add.open}
        />
        <BarButton
          icon={
            locating && !following
              ? 'ellipsis-horizontal'
              : following
                ? 'navigate'
                : 'locate-outline'
          }
          label={following ? 'Följer dig' : 'Hitta mig'}
          color={following ? theme.brandOnSurface : theme.text}
          accessibilityLabel={following ? 'Följer dig' : 'Följ mig på kartan'}
          selected={following}
          onPress={onLocate}
        />
      </View>
      <DropdownMenu
        anchor={people.anchor}
        items={peopleItems}
        onClose={people.close}
        align="start"
        placement="auto"
        title={Words.friends}
      />
      <DropdownMenu
        anchor={add.anchor}
        items={addItems}
        onClose={add.close}
        align="start"
        placement="auto"
        title={Words.placeOnMap}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    flexDirection: 'row',
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  slot: { flex: 1 },
  button: { alignItems: 'center', justifyContent: 'center', gap: Spacing.half },
  pressed: { opacity: 0.7 },
});
