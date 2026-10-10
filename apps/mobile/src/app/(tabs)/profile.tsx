import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { CarPhoto } from '@/components/car-photo';
import { IconButton } from '@/components/icon-button';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteCar,
  fetchFriends,
  fetchMyCars,
  fetchPosts,
  fetchProfile,
  removeAvatar,
  setCarColor,
  updateProfile,
  type Car,
  type Profile,
} from '@/lib/api';
import { CarColorPicker } from '@/features/map/car-color-picker';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { uploadAvatar } from '@/lib/image-upload';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { useAuthStore } from '@/store/auth';

const AVATAR_SIZE = 96;
const CAR_CARD_WIDTH = 160;

function CarCard({ car, onMore }: { car: Car; onMore: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.carCard, { backgroundColor: theme.backgroundElement }]}>
      <CarPhoto imageUrl={car.photo_url} size={CAR_CARD_WIDTH} radius={0} />
      <View style={styles.carMore}>
        <IconButton
          icon="ellipsis-horizontal"
          size={32}
          accessibilityLabel={`Fler val för ${car.nickname ?? `${car.make} ${car.model}`}`}
          onPress={onMore}
        />
      </View>
      <View style={styles.carText}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {car.nickname ?? `${car.make} ${car.model}`}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {[`${car.make} ${car.model}`, car.year].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number | undefined; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
      {value === undefined ? (
        <Skeleton width={24} height={20} />
      ) : (
        <ThemedText type="subtitle" style={styles.statValue}>
          {value}
        </ThemedText>
      )}
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

type EditProfileSheetProps = {
  profile: Profile;
  visible: boolean;
  onClose: () => void;
};

function EditProfileSheet({ profile, visible, onClose }: EditProfileSheetProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!displayName.trim()) {
      setError('Skriv ett visningsnamn.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile(profile.id, {
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        avatarUrl: profile.avatar_url ?? undefined,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(profile.id) });
      showToast({ tone: 'success', message: 'Profilen är sparad.' });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.sheet, { backgroundColor: theme.background }]}
          edges={['top', 'bottom']}
        >
          <KeyboardAvoider style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Button label="Avbryt" variant="ghost" size="sm" onPress={onClose} />
              <ThemedText type="headline">Redigera profil</ThemedText>
              <Button label="Spara" size="sm" loading={saving} onPress={handleSave} />
            </View>
            <ScrollView
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
            >
              <TextField
                label="Visningsnamn"
                value={displayName}
                onChangeText={setDisplayName}
                error={error}
                autoFocus
              />
              <TextField
                label="Bio"
                value={bio}
                onChangeText={setBio}
                placeholder="Vad kör du, var brukar du hänga?"
                multiline
                maxLength={160}
              />
              <ThemedText type="caption" themeColor="textSecondary" style={styles.counter}>
                {bio.length}/160
              </ThemedText>
            </ScrollView>
          </KeyboardAvoider>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const tabBarInset = useTabBarInset();
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  const { data: cars } = useQuery({
    queryKey: queryKeys.cars(userId),
    queryFn: () => fetchMyCars(userId!),
    enabled: !!userId,
  });

  const { data: friends } = useQuery({
    queryKey: queryKeys.friends(userId),
    queryFn: () => fetchFriends(userId!),
    enabled: !!userId,
  });

  const { data: posts } = useQuery({
    queryKey: queryKeys.posts(),
    queryFn: fetchPosts,
  });

  async function handlePickAvatar() {
    if (!userId || !profile) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast({
        tone: 'error',
        message: 'epaRadar behöver tillgång till dina bilder för att byta profilbild.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(userId, result.assets[0].uri);
      await updateProfile(userId, {
        displayName: profile.display_name,
        bio: profile.bio,
        avatarUrl: publicUrl,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    } catch (error) {
      showToast({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Bilden kunde inte laddas upp.',
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!userId || !profile) return;
    const ok = await confirmDestructive({
      title: 'Ta bort profilbilden?',
      message: 'Din profil visas med din första bokstav i stället.',
      confirmLabel: 'Ta bort',
    });
    if (!ok) return;
    setUploadingAvatar(true);
    try {
      await removeAvatar(userId, profile.avatar_url);
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleCarColor(car: Car, color: string) {
    setSelectedCar({ ...car, color });
    try {
      await setCarColor(car.id, color);
      queryClient.invalidateQueries({ queryKey: queryKeys.cars(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendLocations(userId) });
    } catch (error) {
      setSelectedCar(car);
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  async function handleDeleteCar(car: Car) {
    const ok = await confirmDestructive({
      title: `Ta bort ${car.nickname ?? `${car.make} ${car.model}`}?`,
      message: 'Bilen och dess bild tas bort. Inlägg där den är taggad finns kvar, utan taggen.',
      confirmLabel: 'Ta bort',
    });
    if (!ok) return;
    try {
      await deleteCar(car);
      queryClient.invalidateQueries({ queryKey: queryKeys.cars(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      showToast({ message: 'Bilen är borttagen.' });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  const avatarActions: SheetAction[] = [
    { label: 'Välj ny bild', icon: 'image-outline', onPress: handlePickAvatar },
    {
      label: 'Ta bort bild',
      icon: 'trash-outline',
      destructive: true,
      onPress: handleRemoveAvatar,
    },
  ];

  const postCount = posts?.filter((post) => post.author_id === userId).length;

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: tabBarInset }}>
          <View style={styles.padded}>
            <ScreenHeader
              title="Profil"
              actions={
                <IconButton
                  icon="settings-outline"
                  accessibilityLabel="Inställningar"
                  onPress={() => router.push('/settings')}
                />
              }
            />
            <View style={styles.hero}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Byt profilbild"
                onPress={() => (profile?.avatar_url ? setAvatarSheet(true) : handlePickAvatar())}
                disabled={uploadingAvatar || !profile}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <View style={[styles.ring, { borderColor: theme.brand }]}>
                  {profile ? (
                    <Avatar
                      name={profile.display_name}
                      imageUrl={profile.avatar_url}
                      size={AVATAR_SIZE}
                    />
                  ) : (
                    <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} radius={AVATAR_SIZE / 2} />
                  )}
                </View>
                <View
                  style={[
                    styles.avatarBadge,
                    { backgroundColor: theme.brand, borderColor: theme.background },
                  ]}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color={theme.brandText} />
                  ) : (
                    <Ionicons name="camera" size={16} color={theme.brandText} />
                  )}
                </View>
              </Pressable>
              {profileLoading || !profile ? (
                <View style={styles.heroSkeleton}>
                  <Skeleton width={160} height={22} />
                  <Skeleton width={100} />
                </View>
              ) : (
                <>
                  <ThemedText type="subtitle" style={styles.center}>
                    {profile.display_name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    @{profile.username}
                  </ThemedText>
                  {profile.bio ? (
                    <ThemedText style={[styles.center, styles.bio]}>{profile.bio}</ThemedText>
                  ) : null}
                </>
              )}
            </View>

            <View style={styles.stats}>
              <Stat value={cars?.length} label="bilar" />
              <Stat value={friends?.length} label="vänner" />
              <Stat value={postCount} label="inlägg" />
            </View>

            <Button
              label="Redigera profil"
              icon="create-outline"
              variant="secondary"
              disabled={!profile}
              onPress={() => setEditing(true)}
            />

            <View style={styles.sectionHeader}>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
                MINA BILAR
              </ThemedText>
              <Button
                label="Lägg till"
                icon="add"
                size="sm"
                variant="ghost"
                onPress={() => router.push('/cars/new')}
              />
            </View>
          </View>

          {cars && cars.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carRow}
            >
              {cars.map((car) => (
                <CarCard key={car.id} car={car} onMore={() => setSelectedCar(car)} />
              ))}
            </ScrollView>
          ) : cars ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/cars/new')}
              style={({ pressed }) => [
                styles.addCar,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="car-sport-outline" size={28} color={theme.brandOnSurface} />
              <ThemedText type="smallBold">Lägg till din första bil</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
                Bilen visas på din profil och kan taggas i inlägg.
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.carRow}>
              <Skeleton width={CAR_CARD_WIDTH} height={CAR_CARD_WIDTH + 52} radius={Radius.lg} />
              <Skeleton width={CAR_CARD_WIDTH} height={CAR_CARD_WIDTH + 52} radius={Radius.lg} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <ActionSheet
        visible={avatarSheet}
        title="Profilbild"
        onClose={() => setAvatarSheet(false)}
        actions={avatarActions}
      />
      <ActionSheet
        visible={!!selectedCar}
        title={
          selectedCar
            ? (selectedCar.nickname ?? `${selectedCar.make} ${selectedCar.model}`)
            : undefined
        }
        onClose={() => setSelectedCar(null)}
        header={
          selectedCar ? (
            <View style={styles.carColorSheet}>
              <CarColorPicker
                value={selectedCar.color}
                onChange={(color) => handleCarColor(selectedCar, color)}
              />
            </View>
          ) : null
        }
        actions={
          selectedCar
            ? [
                {
                  label: 'Ta bort bil',
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: () => handleDeleteCar(selectedCar),
                },
              ]
            : []
        }
      />
      {profile ? (
        <EditProfileSheet
          key={`${profile.id}:${editing}`}
          profile={profile}
          visible={editing}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  carColorSheet: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  padded: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  hero: { alignItems: 'center', gap: Spacing.one },
  heroSkeleton: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
  ring: {
    borderWidth: 2.5,
    borderRadius: (AVATAR_SIZE + 10) / 2,
    padding: 2.5,
    marginBottom: Spacing.two,
  },
  avatarBadge: {
    position: 'absolute',
    right: 2,
    bottom: Spacing.two + 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  bio: { maxWidth: 320, marginTop: Spacing.one },
  pressed: { opacity: 0.8 },
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
  },
  statValue: { fontVariant: ['tabular-nums'] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { letterSpacing: 0.6 },
  carRow: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three },
  carCard: { width: CAR_CARD_WIDTH, borderRadius: Radius.lg, overflow: 'hidden' },
  carText: { padding: Spacing.two + Spacing.half, gap: Spacing.half },
  carMore: { position: 'absolute', top: Spacing.one, right: Spacing.one },
  addCar: {
    marginHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  sheet: { flex: 1 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  sheetBody: { padding: Spacing.three, gap: Spacing.three },
  counter: { alignSelf: 'flex-end', marginTop: -Spacing.two },
});
