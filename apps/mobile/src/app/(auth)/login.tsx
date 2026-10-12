import { useState } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { PasswordField } from '@/components/password-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { isUnconfirmedEmailError, resendConfirmation } from '@/features/auth/api';
import { emailError } from '@/features/auth/validation';
import { signIn } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { showToast } from '@/store/toast';

const devEmail = __DEV__ ? (process.env.EXPO_PUBLIC_DEV_LOGIN_EMAIL ?? 'test@test.se') : '';
const devPassword = __DEV__ ? (process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD ?? 'testtest') : '';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? devEmail);
  const [password, setPassword] = useState(params.email ? '' : devPassword);
  const [emailProblem, setEmailProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit() {
    const emailIssue = emailError(email);
    setEmailProblem(emailIssue);
    setError(!password ? 'Skriv ditt lösenord.' : null);
    setUnconfirmed(false);
    if (emailIssue || !password) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setUnconfirmed(isUnconfirmedEmailError(err));
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      await resendConfirmation(email.trim());
      router.push({ pathname: '/(auth)/check-email', params: { email: email.trim() } });
    } catch (err) {
      showToast({ tone: 'error', message: getErrorMessage(err) });
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      title="Välkommen tillbaka"
      subtitle="Logga in och kolla vad kompisarna hittar på."
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
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (emailProblem) setEmailProblem(emailError(value));
        }}
        error={emailProblem}
      />
      <PasswordField
        label="Lösenord"
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (error && !unconfirmed) setError(null);
        }}
        onSubmitEditing={handleSubmit}
        error={error}
      />
      {unconfirmed ? (
        <Button
          label="Skicka nytt bekräftelsemejl"
          variant="secondary"
          icon="mail-outline"
          loading={resending}
          onPress={resend}
        />
      ) : null}
      <Link
        href={{ pathname: '/(auth)/forgot-password', params: { email: email.trim() } }}
        style={styles.forgot}
      >
        <ThemedText type="smallBold" themeColor="brandOnSurface">
          Glömt lösenordet?
        </ThemedText>
      </Link>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', paddingVertical: 12 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 4 },
});
