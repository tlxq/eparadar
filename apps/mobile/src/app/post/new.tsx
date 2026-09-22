import { useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '@/components/button';
import { CarPhoto } from '@/components/car-photo';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { createPost, fetchMyCars, type Car } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { uploadPostImage } from '@/lib/image-upload';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

function CarPickerRow({
  car,
  selected,
  onPress,
}: {
  car: Car;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.carRow,
        { borderColor: selected ? theme.brand : theme.border },
      ]}
    >
      <CarPhoto imageUrl={car.photo_url} size={32} />
      <ThemedText type="small">{car.nickname ?? `${car.make} ${car.model}`}</ThemedText>
    </Pressable>
  );
}

export default function NewPostScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [carId, setCarId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: cars } = useQuery({
    queryKey: queryKeys.cars(userId),
    queryFn: () => fetchMyCars(userId!),
    enabled: !!userId,
  });

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setImageUri(result.assets[0].uri);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const imageUrl = imageUri ? await uploadPostImage(userId!, imageUri) : null;
      return createPost({ body, carId, imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      router.back();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TextField
          placeholder="Vad har du på hjärtat?"
          value={body}
          onChangeText={setBody}
          multiline
          style={styles.textarea}
        />
        <Pressable onPress={handlePickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Lägg till bild
            </ThemedText>
          )}
        </Pressable>
        {cars && cars.length > 0 ? (
          <>
            <ThemedText type="smallBold">Koppla till bil</ThemedText>
            {cars.map((car: Car) => (
              <CarPickerRow
                key={car.id}
                car={car}
                selected={carId === car.id}
                onPress={() => setCarId(carId === car.id ? null : car.id)}
              />
            ))}
          </>
        ) : null}
        {error ? <ThemedText type="error">{error}</ThemedText> : null}
        <Button
          label="Publicera"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!body.trim()}
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
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  imagePreview: { width: '100%', aspectRatio: 4 / 3, borderRadius: Spacing.three },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
