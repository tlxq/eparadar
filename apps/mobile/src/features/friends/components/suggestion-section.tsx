import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionLabel } from '@/components/section-label';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';

type SuggestionSectionProps = {
  title: string;
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
};

export function SuggestionSection({
  title,
  isLoading,
  isEmpty,
  emptyText,
  children,
}: SuggestionSectionProps) {
  return (
    <View style={styles.section}>
      <SectionLabel>{title}</SectionLabel>
      {isLoading ? (
        <ThemedText type="small" themeColor="textSecondary">
          Söker…
        </ThemedText>
      ) : isEmpty ? (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <ThemedText type="small" themeColor="textSecondary">
            {emptyText}
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.list}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  list: { gap: Spacing.two },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
});
