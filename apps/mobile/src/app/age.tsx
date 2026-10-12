import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { saveBirthYear } from '@/features/profile/age';
import { useUserId } from '@/hooks/use-user-id';
import { birthYearError } from '@/lib/age';
import { signOut } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';

export default function AgeScreen() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [birthYear, setBirthYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const problem = birthYearError(birthYear);
    if (problem) {
      setError(problem);
      return;
    }
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      await saveBirthYear(userId, Number(birthYear.trim()));
      queryClient.setQueryData(queryKeys.birthYear(userId), Number(birthYear.trim()));
      router.replace('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthShell
      title="Hur gammal är du?"
      subtitle="epaRadar är för dig som är 15 år eller äldre. Bara du ser ditt födelseår, och det går inte att ändra i efterhand."
      footer={
        <>
          <Button label="Fortsätt" onPress={handleSave} loading={saving} />
          <Button label="Logga ut" variant="ghost" onPress={() => signOut()} />
        </>
      }
    >
      <TextField
        label="Födelseår"
        placeholder="2009"
        keyboardType="number-pad"
        maxLength={4}
        value={birthYear}
        onChangeText={setBirthYear}
        error={error}
        autoFocus
      />
    </AuthShell>
  );
}
