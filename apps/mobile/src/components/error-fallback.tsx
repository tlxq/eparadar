import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Common } from '@/constants/strings';

type ErrorFallbackProps = {
  error: Error;
  retry: () => Promise<void>;
};

export function ErrorFallback({ retry }: ErrorFallbackProps) {
  const theme = useTheme();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.icon, { backgroundColor: `${theme.danger}1F` }]}>
        <Ionicons name="construct-outline" size={32} color={theme.danger} />
      </View>
      <ThemedText type="subtitle" style={styles.center}>
        Något gick snett
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>
        Appen stötte på ett fel. Oftast hjälper det att försöka igen.
      </ThemedText>
      <View style={styles.button}>
        <Button label={Common.retry} icon="refresh" onPress={() => retry()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  button: { alignSelf: 'stretch' },
});
