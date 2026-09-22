import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { signIn } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

export default function LoginScreen() {
  const [email, setEmail] = useState(__DEV__ ? 'test@test.se' : '');
  const [password, setPassword] = useState(__DEV__ ? 'testtest' : '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Logga in</ThemedText>
        <TextField
          placeholder="E-post"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          placeholder="Lösenord"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <ThemedText type="error">{error}</ThemedText> : null}
        <Button label="Logga in" onPress={handleSubmit} loading={loading} />
        <Link href="/(auth)/sign-up" style={styles.link}>
          <ThemedText type="link">Skapa konto</ThemedText>
        </Link>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  link: { alignSelf: 'center' },
});
