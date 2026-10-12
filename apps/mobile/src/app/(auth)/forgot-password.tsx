import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { sendPasswordReset } from '@/features/auth/api';
import { AuthTopBar } from '@/features/auth/components/auth-top-bar';
import { MailSentCard } from '@/features/auth/components/mail-sent-card';
import { useResend } from '@/features/auth/use-resend';
import { emailError } from '@/features/auth/validation';
import { getErrorMessage } from '@/lib/errors';

function SentState({ email, onBack }: { email: string; onBack: () => void }) {
  const { resend, sending, waiting, label } = useResend(() => sendPasswordReset(email));
  return (
    <AuthShell
      title="Kolla din mejl!"
      subtitle="Finns det ett konto med den e-posten får du en länk för att välja ett nytt lösenord."
      top={<AuthTopBar onBack={onBack} />}
      footer={
        <>
          <Button label="Till inloggning" onPress={onBack} />
          <Button
            label={label}
            variant="ghost"
            loading={sending}
            disabled={waiting}
            onPress={resend}
          />
        </>
      }
    >
      <MailSentCard email={email} action="Öppna länken på den här mobilen." />
    </AuthShell>
  );
}

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function toLogin() {
    router.replace({ pathname: '/(auth)/login', params: { email: (sentTo ?? email).trim() } });
  }

  async function handleSend() {
    const problem = emailError(email);
    setError(problem);
    if (problem) return;
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSentTo(email.trim());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) return <SentState email={sentTo} onBack={toLogin} />;

  return (
    <AuthShell
      title="Glömt lösenordet?"
      subtitle="Lugnt, det händer. Skriv din e-post så mejlar vi en länk där du väljer ett nytt."
      top={<AuthTopBar onBack={toLogin} />}
      footer={<Button label="Skicka länk" onPress={handleSend} loading={loading} />}
    >
      <TextField
        label="E-post"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        autoFocus={!email}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (error) setError(emailError(value));
        }}
        onSubmitEditing={handleSend}
        error={error}
      />
    </AuthShell>
  );
}
