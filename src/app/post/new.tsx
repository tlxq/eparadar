import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { createPost, fetchMyCars, type Car } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function NewPostScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [carId, setCarId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: cars } = useQuery({
    queryKey: ['cars', userId],
    queryFn: () => fetchMyCars(userId!),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: () => createPost({ body, carId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.back();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Något gick fel.'),
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TextField
          placeholder="Vad har du på hjärtat?"
          value={body}
          onChangeText={setBody}
          multiline
          style={styles.textarea}
        />
        {cars && cars.length > 0 ? (
          <>
            <ThemedText type="smallBold">Koppla till bil</ThemedText>
            {cars.map((car: Car) => (
              <Button
                key={car.id}
                label={car.nickname ?? `${car.make} ${car.model}`}
                variant={carId === car.id ? 'primary' : 'secondary'}
                onPress={() => setCarId(carId === car.id ? null : car.id)}
              />
            ))}
          </>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label="Publicera"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!body.trim()}
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
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#e5484d' },
});
