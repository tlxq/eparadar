import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { signUpWithProfile } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signUpWithProfile({ email, password, username, displayName });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Skapa konto</ThemedText>
        <TextField placeholder="Visningsnamn" value={displayName} onChangeText={setDisplayName} />
        <TextField
          placeholder="Användarnamn"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
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
        <Button label="Skapa konto" onPress={handleSubmit} loading={loading} />
        <Link href="/(auth)/login" style={styles.link}>
          <ThemedText type="link">Har du redan ett konto? Logga in</ThemedText>
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
