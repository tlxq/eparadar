import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

function BrandMark() {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="epaRadar"
      style={[styles.mark, { backgroundColor: theme.brand }]}
    >
      <View style={[styles.markRing, { borderColor: theme.brandText }]}>
        <View style={[styles.markDot, { backgroundColor: theme.brandText }]} />
      </View>
    </View>
  );
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.top}>
              <BrandMark />
              <View style={styles.titles}>
                <ThemedText type="title" accessibilityRole="header">
                  {title}
                </ThemedText>
                <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
              </View>
              <View style={styles.fields}>{children}</View>
            </View>
            <View style={styles.footer}>{footer}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.three,
    gap: Spacing.five,
  },
  top: { gap: Spacing.four },
  titles: { gap: Spacing.one },
  fields: { gap: Spacing.three },
  footer: { gap: Spacing.two },
  mark: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDot: { width: 10, height: 10, borderRadius: 5 },
});
