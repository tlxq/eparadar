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
import { Words } from '@/constants/strings';
import { CarColorPicker } from '@/features/map/car-color-picker';
import { PhotoSourceSheet } from '@/features/profile/components/photo-source-sheet';
import { useCarPhotoUrl } from '@/hooks/use-car-photo-url';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/hooks/use-user-id';
import { createCar, removeCarPhoto, updateCar, type Car } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { uploadCarPhoto } from '@/lib/image-upload';
import { pickImage, type ImageSource } from '@/lib/pick-image';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

function checkYear(year: string): string | null {
  if (!year) return null;
  const maxYear = new Date().getFullYear() + 1;
  if (!/^\d{4}$/.test(year)) return 'Skriv året med fyra siffror, t.ex. 1988.';
  const value = Number(year);
  if (value < 1900 || value > maxYear) return `Året måste vara mellan 1900 och ${maxYear}.`;
  return null;
}

export function CarForm({ car }: { car?: Car }) {
  const theme = useTheme();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [make, setMake] = useState(car?.make ?? '');
  const [model, setModel] = useState(car?.model ?? '');
  const [year, setYear] = useState(car?.year ? String(car.year) : '');
  const [nickname, setNickname] = useState(car?.nickname ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(car?.photo_url ?? null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(car?.color ?? null);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [makeError, setMakeError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [yearError, setYearError] = useState<string | null>(null);

  const signedPhoto = useCarPhotoUrl(photoUrl);
  const shownPhoto = photoUri ?? signedPhoto;

  async function handlePickPhoto(source: ImageSource) {
    const uri = await pickImage({ aspect: [4, 3], source });
    if (!uri) return;
    setPhotoUri(uri);
  }

  function handleRemovePhoto() {
    setPhotoUri(null);
    setPhotoUrl(null);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const uploaded = photoUri ? await uploadCarPhoto(userId!, photoUri) : null;
      const fields = {
        make: make.trim(),
        model: model.trim(),
        year: year ? Number(year) : null,
        nickname: nickname.trim() || null,
        color,
      };
      if (!car) {
        await createCar({ ownerId: userId!, ...fields, photoUrl: uploaded });
        return;
      }
      const nextPhoto = uploaded ?? photoUrl;
      await updateCar(car.id, { ...fields, photoUrl: nextPhoto });
      if (car.photo_url && car.photo_url !== nextPhoto) {
        await removeCarPhoto(car.photo_url).catch(() => undefined);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendLocations(userId) });
      showToast({
        tone: 'success',
        message: car ? 'Kärran är uppdaterad!' : 'Kärran är tillagd!',
      });
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
      title={car ? 'Redigera EPA' : Words.addVehicle}
      footer={
        <>
          {error ? <ThemedText type="error">{error}</ThemedText> : null}
          <Button
            label={car ? 'Spara ändringar' : `Spara ${Words.vehicle}`}
            onPress={handleSave}
            loading={mutation.isPending}
          />
        </>
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shownPhoto ? 'Byt bild' : 'Lägg till bild'}
        onPress={() => setPhotoSheet(true)}
        style={({ pressed }) => [
          styles.photo,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          !shownPhoto && styles.photoEmpty,
          pressed && styles.pressed,
        ]}
      >
        {shownPhoto ? (
          <>
            <Image source={{ uri: shownPhoto }} style={StyleSheet.absoluteFill} />
            <View style={[styles.photoBadge, { backgroundColor: theme.scrimSurface }]}>
              <Ionicons name="camera" size={14} color={theme.onScrim} />
              <ThemedText type="caption" style={{ color: theme.onScrim }}>
                Byt bild
              </ThemedText>
            </View>
          </>
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
      <PhotoSourceSheet
        visible={photoSheet}
        title={`Bild på ${Words.vehicle}:n`}
        onClose={() => setPhotoSheet(false)}
        onPick={handlePickPhoto}
        onRemove={shownPhoto ? handleRemovePhoto : undefined}
      />
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
  photoBadge: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  pressed: { opacity: 0.8 },
  row: { flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },
});
