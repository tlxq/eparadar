import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ScreenBackground } from '@/components/screen-background';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FormScreenProps = {
  children: ReactNode;
  footer: ReactNode;
};

export function FormScreen({ children, footer }: FormScreenProps) {
  const theme = useTheme();

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoider style={styles.container}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: theme.separator }]}>{footer}</View>
        </KeyboardAvoider>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
});
