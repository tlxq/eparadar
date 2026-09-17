import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchMyCars, fetchProfile, signOut, updateProfile, type Car } from '@/lib/api';
import { uploadAvatar } from '@/lib/avatar-upload';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/hooks/use-theme';

function CarRow({ car }: { car: Car }) {
  return (
    <ThemedView type="backgroundElement" style={styles.carRow}>
      <ThemedText type="smallBold">{car.nickname ?? `${car.make} ${car.model}`}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {car.make} {car.model} {car.year ?? ''}
      </ThemedText>
    </ThemedView>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  const { data: cars } = useQuery({
    queryKey: ['cars', userId],
    queryFn: () => fetchMyCars(userId!),
    enabled: !!userId,
  });

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);

  if (profile && profile.id !== loadedProfileId) {
    setLoadedProfileId(profile.id);
    setDisplayName(profile.display_name);
    setBio(profile.bio ?? '');
    setAvatarUrl(profile.avatar_url);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      await updateProfile(userId, { displayName, bio: bio || null, avatarUrl: avatarUrl ?? undefined });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    } finally {
      setSaving(false);
    }
  }

  async function handlePickAvatar() {
    if (!userId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const publicUrl = await uploadAvatar(userId, result.assets[0].uri);
      setAvatarUrl(publicUrl);
      await updateProfile(userId, { displayName, bio: bio || null, avatarUrl: publicUrl });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Bilden kunde inte laddas upp.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={cars ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CarRow car={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="title">Profil</ThemedText>
              <Pressable
                onPress={handlePickAvatar}
                disabled={uploadingAvatar}
                style={styles.avatarPicker}
              >
                <Avatar name={displayName || '?'} imageUrl={avatarUrl} size={88} />
                <View style={[styles.avatarBadge, { backgroundColor: theme.brand, borderColor: theme.background }]}>
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color={theme.brandText} />
                  ) : (
                    <Ionicons name="camera" size={16} color={theme.brandText} />
                  )}
                </View>
              </Pressable>
              {avatarError ? (
                <ThemedText themeColor="danger">{avatarError}</ThemedText>
              ) : null}
              <TextField
                placeholder="Visningsnamn"
                value={displayName}
                onChangeText={setDisplayName}
              />
              <TextField placeholder="Bio" value={bio} onChangeText={setBio} multiline />
              <Button label="Spara" onPress={handleSave} loading={saving} />
              <View style={styles.carsHeader}>
                <ThemedText type="subtitle">Mina bilar</ThemedText>
                <Button
                  label="Lägg till bil"
                  variant="secondary"
                  icon="add-circle-outline"
                  onPress={() => router.push('/cars/new')}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary">Inga bilar tillagda än.</ThemedText>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <Button
                label="Inställningar"
                variant="secondary"
                icon="settings-outline"
                onPress={() => router.push('/settings')}
              />
              <Button
                label="Logga ut"
                variant="secondary"
                icon="log-out-outline"
                onPress={() => signOut()}
              />
            </View>
          }
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  header: { gap: Spacing.two, paddingVertical: Spacing.three },
  avatarPicker: { alignSelf: 'flex-start' },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  list: { gap: Spacing.two, paddingBottom: Spacing.four },
  carRow: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  footer: { marginTop: Spacing.three, gap: Spacing.two },
});
