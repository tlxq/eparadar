import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  actions?: ReactNode;
};

export function ScreenHeader({ title, actions }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <ThemedText type="title" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </ThemedText>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  title: { flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
