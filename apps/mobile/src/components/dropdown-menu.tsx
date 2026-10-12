import { useCallback, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type MenuItem = {
  label: string;
  icon: IconName;
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
  onPress: () => void;
};

export type MenuAnchor = { x: number; y: number; width: number; height: number };

type Align = 'start' | 'end';
type Placement = 'auto' | 'above' | 'below';

const MENU_WIDTH = 248;
const ROW_HEIGHT = 48;
const GAP = Spacing.two;
const CLOSE_DELAY_MS = 250;

export function useDropdown() {
  const ref = useRef<View>(null);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);

  const open = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  }, []);
  const close = useCallback(() => setAnchor(null), []);

  return { ref, anchor, open, close };
}

type DropdownMenuProps = {
  anchor: MenuAnchor | null;
  items: MenuItem[];
  onClose: () => void;
  align?: Align;
  placement?: Placement;
  title?: string;
};

export function DropdownMenu({
  anchor,
  items,
  onClose,
  align = 'end',
  placement = 'auto',
  title,
}: DropdownMenuProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();

  if (!anchor) return null;

  const estimated = items.length * ROW_HEIGHT + Spacing.two * 2 + (title ? 28 : 0);
  const spaceBelow = window.height - insets.bottom - (anchor.y + anchor.height);
  const above =
    placement === 'above' ||
    (placement === 'auto' && spaceBelow < estimated + GAP && anchor.y > spaceBelow);
  const width = Math.min(MENU_WIDTH, window.width - Spacing.three * 2);
  const left =
    align === 'end'
      ? Math.max(Spacing.three, Math.min(anchor.x + anchor.width - width, window.width - width))
      : Math.max(Spacing.three, Math.min(anchor.x, window.width - width - Spacing.three));
  const vertical = above
    ? { bottom: window.height - anchor.y + GAP }
    : { top: anchor.y + anchor.height + GAP };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={Common.close}
        style={styles.backdrop}
        onPress={onClose}
      />
      <View
        accessibilityRole="menu"
        style={[
          styles.menu,
          vertical,
          {
            left,
            width,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.separator,
          },
        ]}
      >
        {title ? (
          <ThemedText type="caption" themeColor="textSecondary" style={styles.title}>
            {title}
          </ThemedText>
        ) : null}
        {items.map((item) => {
          const color = item.disabled
            ? theme.textSecondary
            : item.destructive
              ? theme.danger
              : theme.text;
          return (
            <Pressable
              key={item.label}
              accessibilityRole="menuitem"
              accessibilityState={{ disabled: item.disabled }}
              accessibilityHint={item.hint}
              disabled={item.disabled}
              onPress={() => {
                onClose();
                setTimeout(item.onPress, CLOSE_DELAY_MS);
              }}
              style={({ pressed }) => [
                styles.item,
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <Ionicons name={item.icon} size={20} color={color} />
              <View style={styles.itemText}>
                <ThemedText type="headline" style={{ color }} numberOfLines={1}>
                  {item.label}
                </ThemedText>
                {item.hint ? (
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    {item.hint}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

type DropdownButtonProps = {
  items: MenuItem[];
  accessibilityLabel?: string;
  label?: string;
  icon?: IconName;
  variant?: 'surface' | 'brand' | 'plain';
  size?: number;
  align?: Align;
  placement?: Placement;
  title?: string;
  disabled?: boolean;
  children?: ReactNode;
};

export function DropdownButton({
  items,
  accessibilityLabel,
  label,
  icon = 'ellipsis-horizontal',
  variant = 'surface',
  size = 40,
  align = 'end',
  placement = 'auto',
  title,
  disabled,
  children,
}: DropdownButtonProps) {
  const theme = useTheme();
  const { ref, anchor, open, close } = useDropdown();
  const backgroundColor =
    variant === 'brand'
      ? theme.brand
      : variant === 'surface'
        ? theme.backgroundElement
        : 'transparent';
  const color = variant === 'brand' ? theme.brandText : theme.text;
  const empty = items.length === 0;

  return (
    <>
      <View ref={ref} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label ?? Common.more}
          accessibilityState={{ disabled: disabled || empty, expanded: !!anchor }}
          hitSlop={Math.max(0, (44 - size) / 2)}
          disabled={disabled || empty}
          onPress={open}
          style={({ pressed }) => [
            styles.trigger,
            label || children
              ? [styles.pill, { minHeight: size }]
              : { width: size, height: size, borderRadius: size / 2 },
            { backgroundColor },
            pressed && styles.pressed,
            (disabled || empty) && styles.disabled,
          ]}
        >
          {children ?? (
            <>
              <Ionicons name={icon} size={label ? 18 : Math.round(size * 0.5)} color={color} />
              {label ? (
                <>
                  <ThemedText style={[styles.triggerLabel, { color }]}>{label}</ThemedText>
                  <Ionicons name="chevron-down" size={16} color={color} />
                </>
              ) : null}
            </>
          )}
        </Pressable>
      </View>
      <DropdownMenu
        anchor={anchor}
        items={items}
        onClose={close}
        align={align}
        placement={placement}
        title={title}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  menu: {
    position: 'absolute',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
  },
  title: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.one },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: ROW_HEIGHT,
    paddingHorizontal: Spacing.three,
  },
  itemText: { flex: 1, gap: Spacing.half },
  trigger: { alignItems: 'center', justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  triggerLabel: Typography.button,
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.4 },
});
