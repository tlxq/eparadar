import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type EmptyStateProps = {
  icon: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
};

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconTile, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name={icon} size={30} color={theme.brandOnSurface} />
      </View>
      <ThemedText type="headline" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={[styles.center, styles.message]}>
        {message}
      </ThemedText>
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} icon={action.icon} size="sm" onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  center: { textAlign: 'center' },
  message: { maxWidth: 280 },
  action: { marginTop: Spacing.two },
});
