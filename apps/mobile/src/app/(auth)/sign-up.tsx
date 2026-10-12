import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { signUpWithProfile } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { birthYearError } from '@/lib/age';
import { useTheme } from '@/hooks/use-theme';

export default function SignUpScreen() {
  const theme = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (
      !displayName.trim() ||
      !username.trim() ||
      !birthYear.trim() ||
      !email.trim() ||
      !password
    ) {
      setError('Fyll i alla fält.');
      return;
    }
    const ageError = birthYearError(birthYear);
    if (ageError) {
      setError(ageError);
      return;
    }
    setLoading(true);
    try {
      await signUpWithProfile({
        email: email.trim(),
        password,
        username: username.trim(),
        displayName: displayName.trim(),
        birthYear: Number(birthYear.trim()),
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Skapa konto"
      subtitle="Hitta gänget, visa upp bilen och ses på träffar."
      footer={
        <>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.consent}>
            Genom att skapa ett konto godkänner du{' '}
            <Link href="/terms" style={{ color: theme.brandOnSurface }}>
              användarvillkoren
            </Link>{' '}
            och{' '}
            <Link href="/community" style={{ color: theme.brandOnSurface }}>
              communityreglerna
            </Link>
            . Så hanterar vi dina uppgifter:{' '}
            <Link href="/privacy" style={{ color: theme.brandOnSurface }}>
              integritetspolicyn
            </Link>
            .
          </ThemedText>
          <Button label="Skapa konto" onPress={handleSubmit} loading={loading} />
          <Link href="/(auth)/login" style={styles.link}>
            <ThemedText type="small" themeColor="textSecondary">
              Har du redan ett konto?{' '}
              <ThemedText type="smallBold" themeColor="brandOnSurface">
                Logga in
              </ThemedText>
            </ThemedText>
          </Link>
        </>
      }
    >
      <TextField
        label="Visningsnamn"
        placeholder="Elsa Nyström"
        autoComplete="name"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextField
        label="Användarnamn"
        placeholder="elsa_epa"
        autoCapitalize="none"
        autoComplete="username"
        value={username}
        onChangeText={setUsername}
      />
      <TextField
        label="Födelseår"
        placeholder="2009"
        keyboardType="number-pad"
        maxLength={4}
        value={birthYear}
        onChangeText={setBirthYear}
        hint="Du måste vara minst 15 år. Bara du ser ditt födelseår."
      />
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
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        error={error}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', paddingVertical: 12 },
  consent: { textAlign: 'center' },
});
