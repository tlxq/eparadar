import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ListRowProps = {
  title: string;
  subtitle?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function ListRow({ title, subtitle, leading, trailing, onPress, accessibilityLabel }: ListRowProps) {
  const theme = useTheme();

  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <ThemedText type="headline" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {trailing}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundElement }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 64,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  text: { flex: 1, gap: Spacing.half },
});
