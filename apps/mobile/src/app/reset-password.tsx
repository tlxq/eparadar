import { useState } from 'react';
import { router } from 'expo-router';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { PasswordField } from '@/components/password-field';
import { Skeleton } from '@/components/skeleton';
import { Radius } from '@/constants/theme';
import { updatePassword } from '@/features/auth/api';
import { MIN_PASSWORD_LENGTH, passwordError } from '@/features/auth/validation';
import { signOut } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuthStore } from '@/store/auth';
import { showToast } from '@/store/toast';

export default function ResetPasswordScreen() {
  const session = useAuthStore((state) => state.session);
  const linkPending = useAuthStore((state) => state.linkPending);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const problem = passwordError(password);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await updatePassword(password);
      showToast({ tone: 'success', message: 'Nytt lösenord sparat. Du är inloggad!' });
      router.replace('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (linkPending) {
    return (
      <AuthShell title="Öppnar länken…" subtitle="Vi kollar att den är giltig." footer={null}>
        <Skeleton height={48} radius={Radius.md} />
      </AuthShell>
    );
  }

  if (!session) {
    return (
      <AuthShell
        title="Länken funkar inte längre"
        subtitle="Den kan ha gått ut eller redan använts. Be om en ny så fixar vi det."
        footer={
          <>
            <Button
              label="Be om en ny länk"
              onPress={() => router.replace('/(auth)/forgot-password')}
            />
            <Button
              label="Till inloggning"
              variant="ghost"
              onPress={() => router.replace('/(auth)/login')}
            />
          </>
        }
      >
        {null}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Välj ett nytt lösenord"
      subtitle={`Det gäller för ${session.user.email ?? 'ditt konto'}.`}
      footer={
        <>
          <Button label="Spara lösenord" onPress={handleSave} loading={saving} />
          <Button
            label="Logga ut i stället"
            variant="ghost"
            disabled={saving}
            onPress={() =>
              signOut()
                .catch(() => undefined)
                .then(() => router.replace('/(auth)/login'))
            }
          />
        </>
      }
    >
      <PasswordField
        label="Nytt lösenord"
        autoComplete="new-password"
        textContentType="newPassword"
        autoFocus
        hint={`Minst ${MIN_PASSWORD_LENGTH} tecken.`}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (error) setError(passwordError(value));
        }}
        onSubmitEditing={handleSave}
        error={error}
      />
    </AuthShell>
  );
}
