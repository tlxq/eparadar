import { useState } from 'react';
import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchMyCars, fetchProfile, signOut, updateProfile, type Car } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

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
  const [saving, setSaving] = useState(false);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);

  if (profile && profile.id !== loadedProfileId) {
    setLoadedProfileId(profile.id);
    setDisplayName(profile.display_name);
    setBio(profile.bio ?? '');
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      await updateProfile(userId, { displayName, bio: bio || null });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={cars ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CarRow car={item} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="title">Profil</ThemedText>
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
              <Button label="Logga ut" variant="secondary" onPress={() => signOut()} />
            </View>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  header: { gap: Spacing.two, paddingVertical: Spacing.three },
  carsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  list: { gap: Spacing.two, paddingBottom: Spacing.four },
  carRow: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.half },
  footer: { marginTop: Spacing.three },
});
