import type { ComponentProps, ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CLOSE_DELAY_MS = 250;

export type SheetAction = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
  disabled?: boolean;
  hint?: string;
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  title?: string;
  header?: ReactNode;
  actions: SheetAction[];
  onClose: () => void;
};

export function ActionSheet({ visible, title, header, actions, onClose }: ActionSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Stäng"
        style={styles.backdrop}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.backgroundElement,
            paddingBottom: Math.max(insets.bottom, Spacing.three),
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.backgroundSelected }]} />
        {header}
        {title ? (
          <ThemedText type="caption" themeColor="textSecondary" style={styles.title}>
            {title}
          </ThemedText>
        ) : null}
        {actions.map((action) => {
          const color = action.disabled
            ? theme.textSecondary
            : action.destructive
              ? theme.danger
              : theme.text;
          return (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityState={{ disabled: action.disabled }}
              accessibilityHint={action.hint}
              disabled={action.disabled}
              onPress={() => {
                onClose();
                setTimeout(action.onPress, CLOSE_DELAY_MS);
              }}
              style={({ pressed }) => [
                styles.action,
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <Ionicons name={action.icon} size={22} color={color} />
              <View style={styles.actionText}>
                <ThemedText type="headline" style={{ color }}>
                  {action.label}
                </ThemedText>
                {action.hint ? (
                  <ThemedText type="caption" themeColor="textSecondary">
                    {action.hint}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.cancel,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.background },
          ]}
        >
          <ThemedText type="headline">Avbryt</ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.one,
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: Spacing.two },
  title: { textAlign: 'center', paddingBottom: Spacing.two },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  actionText: { flex: 1, gap: Spacing.half },
  cancel: {
    minHeight: 52,
    marginTop: Spacing.two,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
