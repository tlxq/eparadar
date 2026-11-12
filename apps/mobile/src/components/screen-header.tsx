import type { ReactNode } from 'react';
import { router } from 'expo-router';

import { StyleSheet, View } from 'react-native';

import { HeaderBar } from '@/components/header-bar';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Spacing } from '@/constants/theme';

type ScreenHeaderProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  root?: boolean;
  titleVisible?: boolean;
  titleLeading?: ReactNode;
  onTitlePress?: () => void;
  titleHint?: string;
};

export function ScreenHeader({ root, actions, ...bar }: ScreenHeaderProps) {
  if (root && bar.title) {
    return (
      <View style={styles.tabHeader}>
        <ThemedText
          type="title"
          accessibilityRole="header"
          numberOfLines={1}
          style={styles.tabTitle}
        >
          {bar.title}
        </ThemedText>
        {actions ? <View style={styles.tabActions}>{actions}</View> : null}
      </View>
    );
  }
  return (
    <HeaderBar
      {...bar}
      left={
        root ? null : (
          <IconButton
            icon="chevron-back"
            variant="plain"
            accessibilityLabel={Common.back}
            onPress={() => router.back()}
          />
        )
      }
      right={actions}
    />
  );
}

const styles = StyleSheet.create({
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  tabTitle: { flexShrink: 1 },
  tabActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
