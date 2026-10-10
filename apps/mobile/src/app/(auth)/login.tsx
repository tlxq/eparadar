import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { signIn } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

const devEmail = __DEV__ ? (process.env.EXPO_PUBLIC_DEV_LOGIN_EMAIL ?? 'test@test.se') : '';
const devPassword = __DEV__ ? (process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD ?? 'testtest') : '';

export default function LoginScreen() {
  const [email, setEmail] = useState(devEmail);
  const [password, setPassword] = useState(devPassword);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Fyll i e-post och lösenord.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Välkommen tillbaka"
      subtitle="Logga in för att se vad gänget hittar på."
      footer={
        <>
          <Button label="Logga in" onPress={handleSubmit} loading={loading} />
          <Link href="/(auth)/sign-up" style={styles.link}>
            <ThemedText type="small" themeColor="textSecondary">
              Ny här?{' '}
              <ThemedText type="smallBold" themeColor="brandOnSurface">
                Skapa konto
              </ThemedText>
            </ThemedText>
          </Link>
        </>
      }
    >
      <TextField
        label="E-post"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label="Lösenord"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleSubmit}
        error={error}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', paddingVertical: 12 },
});
