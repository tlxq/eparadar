import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '@/components/button';
import { CarPhoto } from '@/components/car-photo';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { createCar } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { uploadCarPhoto } from '@/lib/image-upload';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

export default function NewCarScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [nickname, setNickname] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoUri(result.assets[0].uri);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const photoUrl = photoUri ? await uploadCarPhoto(userId!, photoUri) : null;
      return createCar({
        ownerId: userId!,
        make,
        model,
        year: year ? Number(year) : null,
        nickname: nickname || null,
        photoUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cars(userId) });
      router.back();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={handlePickPhoto} style={styles.photoPicker}>
          <CarPhoto imageUrl={photoUri} size={72} />
          <ThemedText type="small" themeColor="textSecondary">
            {photoUri ? 'Byt bild' : 'Lägg till bild'}
          </ThemedText>
        </Pressable>
        <TextField placeholder="Märke" value={make} onChangeText={setMake} />
        <TextField placeholder="Modell" value={model} onChangeText={setModel} />
        <TextField
          placeholder="Årsmodell"
          value={year}
          onChangeText={setYear}
          keyboardType="number-pad"
        />
        <TextField placeholder="Smeknamn" value={nickname} onChangeText={setNickname} />
        {error ? <ThemedText type="error">{error}</ThemedText> : null}
        <Button
          label="Spara"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!make.trim() || !model.trim()}
        />
      </SafeAreaView>
    </ScreenBackground>
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
  photoPicker: { alignItems: 'center', gap: Spacing.one },
});
