import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  top?: ReactNode;
};

function BrandMark() {
  return (
    <Image
      source={require('@/assets/images/icon.png')}
      accessibilityRole="image"
      accessibilityLabel="epaRadar"
      style={styles.mark}
    />
  );
}

export function AuthShell({ title, subtitle, children, footer, top }: AuthShellProps) {
  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoider style={styles.container}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.top}>
              {top ?? <BrandMark />}
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
        </KeyboardAvoider>
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
  mark: { width: 56, height: 56, borderRadius: Radius.lg },
});
