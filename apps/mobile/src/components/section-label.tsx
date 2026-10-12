import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

type SectionLabelProps = {
  children: string;
  style?: StyleProp<TextStyle>;
};

export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <ThemedText
      type="caption"
      themeColor="textSecondary"
      accessibilityRole="header"
      style={[styles.label, style]}
    >
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  label: { letterSpacing: 0.6, textTransform: 'uppercase' },
});
