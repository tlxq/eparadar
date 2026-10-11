import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { deleteCar, removeAvatar, setCarColor, updateProfile, type Car } from '@/lib/api';
import { CarColorPicker } from '@/features/map/car-color-picker';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { uploadAvatar } from '@/lib/image-upload';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { useMyCars, useMyPostCount, useProfile } from '@/features/profile/hooks';
import { useFriends } from '@/features/friends/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { pickImage } from '@/lib/pick-image';
import {
  CAR_CARD_WIDTH,
  CarCard,
  EditProfileSheet,
  Stat,
} from '@/features/profile/components/profile-parts';
const AVATAR_SIZE = 96;

export default function ProfileScreen() {
  const theme = useTheme();
  const tabBarInset = useTabBarInset();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);

  const { data: profile, isLoading: profileLoading } = useProfile();

  const { data: cars } = useMyCars();

  const { data: friends } = useFriends();

  const { data: postCount } = useMyPostCount();

  async function handlePickAvatar() {
    if (!userId || !profile) return;
    const uri = await pickImage({ aspect: [1, 1] });
    if (!uri) return;

    setUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(userId, uri);
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { letterSpacing: 0.6 },
  carRow: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three },
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
});
