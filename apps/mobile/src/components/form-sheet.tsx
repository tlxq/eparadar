import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ModalHeader } from '@/components/modal-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
            <ModalHeader title={title} onClose={onClose} action={action} />
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
  body: { padding: Spacing.three },
});
