import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type SuggestionSectionProps = {
  title: string;
  isLoading: boolean;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
};

export function SuggestionSection({ title, isLoading, isEmpty, emptyText, children }: SuggestionSectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
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
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
