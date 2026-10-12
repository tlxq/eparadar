import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ErrorStateProps = {
  message: string;
  title?: string;
  onRetry: () => unknown;
};

export function ErrorState({ message, title = 'Hoppsan, det strular.', onRetry }: ErrorStateProps) {
  const theme = useTheme();
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <View accessibilityRole="alert" style={styles.container}>
      <View style={[styles.iconTile, { backgroundColor: `${theme.danger}24` }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={theme.danger} />
      </View>
      <ThemedText type="headline" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={[styles.center, styles.message]}>
        {message}
      </ThemedText>
      <View style={styles.action}>
        <Button
          label={Common.retry}
          icon="refresh"
          size="sm"
          variant="secondary"
          loading={retrying}
          onPress={retry}
        />
      </View>
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
