import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Common } from '@/constants/strings';

type ModalHeaderProps = {
  title: string;
  variant?: 'close' | 'back';
  actions?: ReactNode;
};

export function ModalHeader({ title, variant = 'close', actions }: ModalHeaderProps) {
  return (
    <View style={styles.nav}>
      {variant === 'back' ? (
        <IconButton
          icon="chevron-back"
          variant="plain"
          accessibilityLabel={Common.back}
          onPress={() => router.back()}
        />
      ) : (
        <IconButton icon="close" accessibilityLabel={Common.close} onPress={() => router.back()} />
      )}
      <ThemedText type="headline" accessibilityRole="header" numberOfLines={1}>
        {title}
      </ThemedText>
      <View style={styles.spacer}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  spacer: { width: 40, alignItems: 'flex-end' },
});
