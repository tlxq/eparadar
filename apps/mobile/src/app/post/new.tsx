import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { FormScreen } from '@/components/form-screen';
import { IconButton } from '@/components/icon-button';
import { SectionLabel } from '@/components/section-label';
import { ThemedText } from '@/components/themed-text';
import { Words } from '@/constants/strings';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createPost } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { uploadPostImage } from '@/lib/image-upload';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { useMyCars, useProfile } from '@/features/profile/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { pickImage, type ImageSource } from '@/lib/pick-image';
import { Chip } from '@/components/chip';
import { successHaptic } from '@/lib/haptics';
import { confirmDestructive } from '@/lib/confirm';
import { dropPostOnMap } from '@/features/feed/api';
import { Switch } from '@/components/switch';

const MAX_LENGTH = 500;

export default function NewPostScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const params = useLocalSearchParams<{ carId?: string }>();
  const [carId, setCarId] = useState<string | null>(params.carId ?? null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const published = useRef(false);
  const navigation = useNavigation();

  const dirty = !!body.trim() || !!imageUri;

  usePreventRemove(dirty, ({ data }) => {
    if (published.current) {
      navigation.dispatch(data.action);
      return;
    }
    confirmDestructive({
      title: 'Släng utkastet?',
      message: 'Texten och bilden försvinner.',
      confirmLabel: 'Släng',
      cancelLabel: 'Fortsätt skriva',
    }).then((ok) => {
      if (ok) navigation.dispatch(data.action);
    });
  });

  async function togglePlace(on: boolean) {
    if (!on) {
      setPlace(null);
      return;
    }
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        showToast({
          tone: 'error',
          message: 'Appen får inte se din plats. Slå på det i inställningarna.',
        });
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPlace({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch {
      showToast({ tone: 'error', message: 'Hittar inte din position. Testa igen om en stund.' });
    } finally {
      setLocating(false);
    }
  }

  const { data: profile } = useProfile();

  const { data: cars } = useMyCars();

  async function handlePickImage(source: ImageSource) {
    const uri = await pickImage({ aspect: [4, 3], source });
    if (!uri) return;
    setImageUri(uri);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const imageUrl = imageUri ? await uploadPostImage(userId!, imageUri) : null;
      const postId = await createPost({ body: body.trim(), carId, imageUrl });
      if (!place) return false;
      try {
        await dropPostOnMap({ postId, authorId: userId!, ...place });
        return true;
      } catch {
        return null;
      }
    },
    onSuccess: (dropped) => {
      successHaptic();
      published.current = true;
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      if (dropped === null) {
        showToast({ tone: 'error', message: 'Posten är ute, men platsen kom inte med.' });
      } else {
        showToast({
          tone: 'success',
          message: dropped ? 'Posten är ute och syns på kartan i 24 timmar!' : 'Posten är ute!',
        });
      }
      router.back();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const name = profile?.display_name ?? '';

  return (
    <FormScreen
      footer={
        <>
          {error ? <ThemedText type="error">{error}</ThemedText> : null}
          <View style={styles.footerRow}>
            <IconButton
              icon="camera-outline"
              accessibilityLabel="Ta bild"
              onPress={() => handlePickImage('camera')}
            />
            <IconButton
              icon="image-outline"
              accessibilityLabel="Lägg till bild"
              onPress={() => handlePickImage('library')}
            />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.counter}>
              {body.length}/{MAX_LENGTH}
            </ThemedText>
            <Button
              label={Words.publishPost}
              size="sm"
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={(!body.trim() && !imageUri) || locating}
            />
          </View>
        </>
      }
    >
      <View style={styles.composer}>
        <Avatar name={name || '?'} imageUrl={profile?.avatar_url} size={40} />
        <View style={styles.composerBody}>
          <ThemedText type="headline">{name}</ThemedText>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={imageUri ? 'Skriv en bildtext om du vill' : 'Vad händer med kärran?'}
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Post"
            multiline
            autoFocus
            maxLength={MAX_LENGTH}
            style={[styles.input, { color: theme.text }]}
          />
        </View>
      </View>

      {imageUri ? (
        <View>
          <Image
            source={{ uri: imageUri }}
            style={styles.imagePreview}
            accessibilityLabel="Vald bild"
          />
          <View style={styles.removeImage}>
            <IconButton
              icon="close"
              size={32}
              accessibilityLabel="Ta bort bild"
              onPress={() => setImageUri(null)}
            />
          </View>
        </View>
      ) : null}

      <View style={[styles.drop, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons
          name="location-outline"
          size={22}
          color={place ? theme.accent : theme.textSecondary}
        />
        <View style={styles.dropText}>
          <ThemedText type="headline">Släpp på kartan</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {place
              ? 'Kompisar ser posten där du är nu, i 24 timmar. Stäng av här om du ångrar dig.'
              : 'Bara kompisar ser den, och den försvinner från kartan efter 24 timmar.'}
          </ThemedText>
        </View>
        <Switch
          value={!!place}
          onValueChange={togglePlace}
          disabled={locating}
          accessibilityLabel="Släpp posten på kartan"
        />
      </View>

      {cars && cars.length > 0 ? (
        <View style={styles.carSection}>
          <SectionLabel>Tagga EPA</SectionLabel>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {cars.map((car) => {
              const selected = carId === car.id;
              return (
                <Chip
                  key={car.id}
                  label={car.nickname ?? `${car.make} ${car.model}`}
                  selected={selected}
                  onPress={() => setCarId(selected ? null : car.id)}
                  leading={(isSelected, color) => (
                    <Ionicons
                      name={isSelected ? 'checkmark' : 'car-sport-outline'}
                      size={16}
                      color={color}
                    />
                  )}
                />
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  composer: { flexDirection: 'row', gap: Spacing.three },
  composerBody: { flex: 1, gap: Spacing.one },
  input: {
    minHeight: 120,
    ...Typography.lead,
    textAlignVertical: 'top',
    padding: 0,
  },
  imagePreview: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.lg },
  removeImage: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  carSection: { gap: Spacing.two },
  drop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  dropText: { flex: 1, gap: Spacing.half },
  chips: { gap: Spacing.two },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  counter: { flex: 1, textAlign: 'right' },
});
