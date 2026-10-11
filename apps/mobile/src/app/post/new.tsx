import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { FormScreen } from '@/components/form-screen';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createPost } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { uploadPostImage } from '@/lib/image-upload';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { useMyCars, useProfile } from '@/features/profile/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { pickImage } from '@/lib/pick-image';
import { Chip } from '@/components/chip';

const MAX_LENGTH = 500;

export default function NewPostScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [carId, setCarId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useProfile();

  const { data: cars } = useMyCars();

  async function handlePickImage() {
    const uri = await pickImage({ aspect: [4, 3] });
    if (!uri) return;
    setImageUri(uri);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const imageUrl = imageUri ? await uploadPostImage(userId!, imageUri) : null;
      return createPost({ body: body.trim(), carId, imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      showToast({ tone: 'success', message: 'Inlägget är publicerat.' });
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
              icon="image-outline"
              accessibilityLabel="Lägg till bild"
              onPress={handlePickImage}
            />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.counter}>
              {body.length}/{MAX_LENGTH}
            </ThemedText>
            <Button
              label="Publicera"
              size="sm"
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!body.trim()}
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
            placeholder="Vad händer med bilen?"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Inlägg"
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

      {cars && cars.length > 0 ? (
        <View style={styles.carSection}>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
            TAGGA BIL
          </ThemedText>
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
  sectionLabel: { letterSpacing: 0.6 },
  chips: { gap: Spacing.two },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  counter: { flex: 1, textAlign: 'right' },
});
