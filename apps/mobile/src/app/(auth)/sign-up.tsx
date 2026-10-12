import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect } from 'expo-router';
import { BackHandler, Platform, StyleSheet } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { PasswordField } from '@/components/password-field';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { isSignUpDatabaseError, signUpWithProfile } from '@/features/auth/api';
import { AuthTopBar } from '@/features/auth/components/auth-top-bar';
import {
  MIN_PASSWORD_LENGTH,
  displayNameError,
  emailError,
  normalizeUsername,
  passwordError,
  usernameError,
} from '@/features/auth/validation';
import { useTheme } from '@/hooks/use-theme';
import { birthYearError } from '@/lib/age';
import { getErrorMessage } from '@/lib/errors';

const STEPS = ['name', 'username', 'birthYear', 'email', 'password'] as const;
type Step = (typeof STEPS)[number];
type Values = Record<Step, string>;

const VALIDATORS: Record<Step, (value: string) => string | null> = {
  name: displayNameError,
  username: usernameError,
  birthYear: (value) => birthYearError(value),
  email: emailError,
  password: passwordError,
};

const COPY: Record<Step, { title: string; subtitle: string }> = {
  name: {
    title: 'Vad heter du?',
    subtitle: 'Det här ser dina kompisar. Förnamn räcker gott.',
  },
  username: {
    title: 'Välj ett användarnamn',
    subtitle: 'Det syns som @namn på din profil.',
  },
  birthYear: {
    title: 'Vilket år är du född?',
    subtitle: 'Vi frågar för att hålla epaRadar tryggt. Bara du ser ditt födelseår.',
  },
  email: {
    title: 'Din e-post',
    subtitle: 'Vi mejlar en länk så att du kan bekräfta att det är du.',
  },
  password: {
    title: 'Välj ett lösenord',
    subtitle: 'Sista steget, sen är du inne!',
  },
};

export default function SignUpScreen() {
  const theme = useTheme();
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<Values>({
    name: '',
    username: '',
    birthYear: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Step, string | null>>>({});
  const [loading, setLoading] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      return true;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
    return true;
  }, [stepIndex]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;
      const subscription = BackHandler.addEventListener('hardwareBackPress', goBack);
      return () => subscription.remove();
    }, [goBack]),
  );

  function setValue(value: string) {
    setValues((current) => ({ ...current, [step]: value }));
    if (errors[step]) setErrors((current) => ({ ...current, [step]: VALIDATORS[step](value) }));
  }

  function showError(target: Step, message: string) {
    setErrors((current) => ({ ...current, [target]: message }));
    setStepIndex(STEPS.indexOf(target));
  }

  async function next() {
    const problem = VALIDATORS[step](values[step]);
    setErrors((current) => ({ ...current, [step]: problem }));
    if (problem || loading) return;
    if (!isLast) {
      setStepIndex(stepIndex + 1);
      return;
    }
    setLoading(true);
    try {
      const email = values.email.trim();
      const result = await signUpWithProfile({
        email,
        password: values.password,
        username: normalizeUsername(values.username),
        displayName: values.name.trim(),
        birthYear: Number(values.birthYear.trim()),
      });
      if (result.needsConfirmation) {
        router.replace({ pathname: '/(auth)/check-email', params: { email } });
      }
    } catch (err) {
      const code = (err as { code?: unknown } | null)?.code;
      if (isSignUpDatabaseError(err)) {
        showError('username', 'Användarnamnet är redan taget. Testa ett annat.');
      } else if (code === 'user_already_exists' || code === 'email_exists') {
        showError('email', getErrorMessage(err));
      } else if (code === 'email_address_invalid') {
        showError('email', getErrorMessage(err));
      } else {
        showError('password', getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }

  const fieldProps = {
    value: values[step],
    onChangeText: setValue,
    error: errors[step],
    autoFocus: true,
    returnKeyType: isLast ? ('done' as const) : ('next' as const),
    onSubmitEditing: next,
    submitBehavior: 'submit' as const,
  };

  return (
    <AuthShell
      title={COPY[step].title}
      subtitle={COPY[step].subtitle}
      top={<AuthTopBar onBack={goBack} step={stepIndex + 1} total={STEPS.length} />}
      footer={
        <>
          {isLast ? (
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
          ) : null}
          <Button label={isLast ? 'Skapa konto' : 'Nästa'} onPress={next} loading={loading} />
          {stepIndex === 0 ? (
            <Link href="/(auth)/login" replace style={styles.link}>
              <ThemedText type="small" themeColor="textSecondary">
                Har du redan ett konto?{' '}
                <ThemedText type="smallBold" themeColor="brandOnSurface">
                  Logga in
                </ThemedText>
              </ThemedText>
            </Link>
          ) : null}
        </>
      }
    >
      {step === 'name' ? (
        <TextField
          key={step}
          label="Visningsnamn"
          placeholder="Elsa"
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          maxLength={40}
          {...fieldProps}
        />
      ) : null}
      {step === 'username' ? (
        <TextField
          key={step}
          label="Användarnamn"
          placeholder="elsa_epa"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="username"
          maxLength={21}
          hint="3–20 tecken: a–z, siffror, punkt och understreck. Går inte att ändra senare."
          {...fieldProps}
        />
      ) : null}
      {step === 'birthYear' ? (
        <TextField
          key={step}
          label="Födelseår"
          placeholder="2009"
          keyboardType="number-pad"
          maxLength={4}
          hint="Går inte att ändra senare."
          {...fieldProps}
        />
      ) : null}
      {step === 'email' ? (
        <TextField
          key={step}
          label="E-post"
          placeholder="namn@exempel.se"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          {...fieldProps}
        />
      ) : null}
      {step === 'password' ? (
        <PasswordField
          key={step}
          label="Lösenord"
          autoComplete="new-password"
          textContentType="newPassword"
          hint={`Minst ${MIN_PASSWORD_LENGTH} tecken.`}
          {...fieldProps}
        />
      ) : null}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', paddingVertical: 12 },
  consent: { textAlign: 'center' },
});
