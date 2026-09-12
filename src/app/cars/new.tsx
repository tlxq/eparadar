import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { createCar } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function NewCarScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createCar({
        ownerId: userId!,
        make,
        model,
        year: year ? Number(year) : null,
        nickname: nickname || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars', userId] });
      router.back();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Något gick fel.'),
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TextField placeholder="Märke" value={make} onChangeText={setMake} />
        <TextField placeholder="Modell" value={model} onChangeText={setModel} />
        <TextField
          placeholder="Årsmodell"
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
        />
        <TextField placeholder="Smeknamn" value={nickname} onChangeText={setNickname} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label="Spara"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!make.trim() || !model.trim()}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  error: { color: '#e5484d' },
});
