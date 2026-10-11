import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Common } from '@/constants/strings';

type FormSheetProps = {
  title: string;
  onClose: () => void;
  visible?: boolean;
  action?: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean };
  gap?: keyof typeof Spacing;
  children: ReactNode;
};

export function FormSheet({
  title,
  onClose,
  visible = true,
  action,
  gap = 'three',
  children,
}: FormSheetProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.sheet, { backgroundColor: theme.background }]}
          edges={['top', 'bottom']}
        >
          <KeyboardAvoider style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.side}>
                <Button label={Common.cancel} variant="ghost" size="sm" onPress={onClose} />
              </View>
              <ThemedText type="headline" accessibilityRole="header" numberOfLines={1}>
                {title}
              </ThemedText>
              <View style={[styles.side, styles.sideEnd]}>
                {action ? (
                  <Button
                    label={action.label}
                    size="sm"
                    loading={action.loading}
                    disabled={action.disabled}
                    onPress={action.onPress}
                  />
                ) : null}
              </View>
            </View>
            <ScrollView
              contentContainerStyle={[styles.body, { gap: Spacing[gap] }]}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </KeyboardAvoider>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  side: { minWidth: 80, alignItems: 'flex-start' },
  sideEnd: { alignItems: 'flex-end' },
  body: { padding: Spacing.three },
});
