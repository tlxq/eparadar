import type { ComponentProps } from 'react';
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
  onToggleGhost: () => void;
  onAddRagga: () => void;
  onAddWarning: () => void;
  onAddMeet: () => void;
  onLocate: () => void;
  following: boolean;
  locating: boolean;
};

type RoundButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  label?: string;
  active?: boolean;
  checked?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function RoundButton({
  icon,
  accessibilityLabel,
  label,
  active,
  checked,
  selected,
  disabled,
  onPress,
}: RoundButtonProps) {
  const theme = useTheme();
  const color = active ? theme.brandText : theme.text;
  return (
    <Pressable
      accessibilityRole={checked === undefined ? 'button' : 'switch'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.round,
        label ? styles.withLabel : null,
        {
          backgroundColor: active ? theme.brand : theme.backgroundElement,
          borderColor: active ? theme.brand : theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={color} />
      {label ? (
        <ThemedText type="smallBold" style={{ color }} numberOfLines={1}>
          {label}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

export function MapActionBar({
  bottom,
  ghost,
  ghostBusy,
  onToggleGhost,
  onAddRagga,
  onAddWarning,
  onAddMeet,
  onLocate,
  following,
  locating,
}: MapActionBarProps) {
  const theme = useTheme();
  const { ref: addRef, anchor: addAnchor, open: openAdd, close: closeAdd } = useDropdown();

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
      <View style={[styles.column, { bottom }]} pointerEvents="box-none">
        <RoundButton
          icon={ghost ? 'eye-off' : 'eye-outline'}
          label={ghost ? 'Spökläge på' : undefined}
          active={ghost}
          accessibilityLabel={
            ghost ? 'Spökläge är på. Kompisarna ser dig inte' : 'Spökläge, kompisarna slutar se dig'
          }
          checked={ghost}
          disabled={ghostBusy}
          onPress={onToggleGhost}
        />
        <RoundButton
          icon={
            locating && !following
              ? 'ellipsis-horizontal'
              : following
                ? 'navigate'
                : 'locate-outline'
          }
          active={following}
          accessibilityLabel={following ? 'Följer dig' : 'Följ mig på kartan'}
          selected={following}
          onPress={onLocate}
        />
        <View ref={addRef} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={Words.placeOnMap}
            accessibilityState={{ expanded: !!addAnchor }}
            onPress={openAdd}
            style={({ pressed }) => [
              styles.place,
              { backgroundColor: theme.brand, boxShadow: `0 10px 24px ${theme.brand}66` },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="add" size={26} color={theme.brandText} />
            <ThemedText type="smallBold" style={{ color: theme.brandText }}>
              {Words.place}
            </ThemedText>
          </Pressable>
        </View>
      </View>
      <DropdownMenu
        anchor={addAnchor}
        items={addItems}
        onClose={closeAdd}
        align="end"
        placement="auto"
        title={Words.placeOnMap}
      />
    </>
  );
}

const ROUND = 48;

const styles = StyleSheet.create({
  column: {
    position: 'absolute',
    right: Spacing.three,
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  round: {
    minWidth: ROUND,
    height: ROUND,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  withLabel: { paddingHorizontal: Spacing.three },
  place: {
    height: 56,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.four,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
