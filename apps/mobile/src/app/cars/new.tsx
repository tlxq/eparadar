import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { FormScreen } from '@/components/form-screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { CarColorPicker } from '@/features/map/car-color-picker';
import { useTheme } from '@/hooks/use-theme';
import { createCar } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { uploadCarPhoto } from '@/lib/image-upload';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { useUserId } from '@/hooks/use-user-id';
import { pickImage } from '@/lib/pick-image';

function checkYear(year: string): string | null {
  if (!year) return null;
  const maxYear = new Date().getFullYear() + 1;
  if (!/^\d{4}$/.test(year)) return 'Skriv året med fyra siffror, t.ex. 1988.';
  const value = Number(year);
  if (value < 1900 || value > maxYear) return `Året måste vara mellan 1900 och ${maxYear}.`;
  return null;
}

export default function NewCarScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [nickname, setNickname] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [makeError, setMakeError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [yearError, setYearError] = useState<string | null>(null);

  async function handlePickPhoto() {
    const uri = await pickImage({ aspect: [4, 3] });
    if (!uri) return;
    setPhotoUri(uri);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const photoUrl = photoUri ? await uploadCarPhoto(userId!, photoUri) : null;
      return createCar({
        ownerId: userId!,
        make: make.trim(),
        model: model.trim(),
        year: year ? Number(year) : null,
        nickname: nickname.trim() || null,
        photoUrl,
        color,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cars(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendLocations(userId) });
      showToast({ tone: 'success', message: 'Kärran är tillagd!' });
      router.back();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function handleSave() {
    const nextMakeError = make.trim() ? null : 'Skriv vilket märke det är.';
    const nextModelError = model.trim() ? null : 'Skriv vilken modell det är.';
    const nextYearError = checkYear(year);
    setMakeError(nextMakeError);
    setModelError(nextModelError);
    setYearError(nextYearError);
    if (nextMakeError || nextModelError || nextYearError) return;
    mutation.mutate();
  }

  return (
    <FormScreen
      footer={
        <>
          {error ? <ThemedText type="error">{error}</ThemedText> : null}
          <Button label="Spara EPA" onPress={handleSave} loading={mutation.isPending} />
        </>
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={photoUri ? 'Byt bild' : 'Lägg till bild'}
        onPress={handlePickPhoto}
        style={({ pressed }) => [
          styles.photo,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          !photoUri && styles.photoEmpty,
          pressed && styles.pressed,
        ]}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={32} color={theme.brandOnSurface} />
            <ThemedText type="smallBold">Lägg till bild</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Helst från sidan, i dagsljus
            </ThemedText>
          </>
        )}
      </Pressable>
      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label="Märke"
            placeholder="Volvo"
            value={make}
            onChangeText={(text) => {
              setMake(text);
              if (makeError) setMakeError(null);
            }}
            error={makeError}
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label="Modell"
            placeholder="240"
            value={model}
            onChangeText={(text) => {
              setModel(text);
              if (modelError) setModelError(null);
            }}
            error={modelError}
          />
        </View>
      </View>
      <TextField
        label="Årsmodell"
        placeholder="1988"
        value={year}
        onChangeText={(text) => {
          setYear(text);
          if (yearError) setYearError(null);
        }}
        onBlur={() => setYearError(checkYear(year))}
        keyboardType="number-pad"
        maxLength={4}
        error={yearError}
      />
      <TextField
        label="Smeknamn (valfritt)"
        placeholder="Röda faran"
        value={nickname}
        onChangeText={setNickname}
      />
      <CarColorPicker value={color} onChange={setColor} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  photoEmpty: { borderWidth: 1.5, borderStyle: 'dashed' },
  pressed: { opacity: 0.8 },
  row: { flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },
});
