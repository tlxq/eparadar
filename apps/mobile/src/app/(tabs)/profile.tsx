import { useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { SectionLabel } from '@/components/section-label';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import {
  deleteCar,
  removeAvatar,
  setCarColor,
  updateProfile,
  type Car,
  type Post,
} from '@/lib/api';
import { CarColorPicker } from '@/features/map/car-color-picker';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { uploadAvatar } from '@/lib/image-upload';
import { queryKeys } from '@/lib/query-keys';
import { showToast, showUndoToast } from '@/store/toast';
import { useMyCars, useMyPostCount, useMyPosts, useProfile } from '@/features/profile/hooks';
import { PostItem } from '@/features/feed/components/post-item';
import { PostActionsSheet } from '@/features/feed/components/post-actions-sheet';
import { useFriends } from '@/features/friends/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { pickImage, type ImageSource } from '@/lib/pick-image';
import { PhotoSourceSheet } from '@/features/profile/components/photo-source-sheet';
import { openCar } from '@/store/person-sheet';
import {
  CAR_CARD_WIDTH,
  CarCard,
  EditProfileSheet,
  Stat,
} from '@/features/profile/components/profile-parts';
import { Common, Counts, loadError, Words } from '@/constants/strings';
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
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef({ cars: 0, posts: 0 });

  const profileQuery = useProfile();
  const { data: profile, isLoading: profileLoading, isError: profileError } = profileQuery;

  const carsQuery = useMyCars();
  const { data: cars } = carsQuery;

  const friendsQuery = useFriends();
  const { data: friends } = friendsQuery;

  const postCountQuery = useMyPostCount();
  const { data: postCount } = postCountQuery;

  const myPosts = useMyPosts();
  const pull = usePullRefresh(() =>
    Promise.all([
      profileQuery.refetch(),
      carsQuery.refetch(),
      friendsQuery.refetch(),
      postCountQuery.refetch(),
      myPosts.refetch(),
    ]),
  );
  const posts = useMemo(() => myPosts.data?.pages.flat() ?? [], [myPosts.data]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  function scrollTo(section: 'cars' | 'posts') {
    scrollRef.current?.scrollTo({ y: Math.max(0, offsets.current[section] - Spacing.three) });
  }

  async function handlePickAvatar(source: ImageSource) {
    if (!userId || !profile) return;
    const uri = await pickImage({ aspect: [1, 1], source });
    if (!uri) return;

    setUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(userId, uri);
      await updateProfile({
        displayName: profile.display_name,
        bio: profile.bio,
        avatarUrl: publicUrl,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    } catch (error) {
      showToast({
        tone: 'error',
        message: `Bilden kunde inte laddas upp. ${getErrorMessage(error)}`,
      });
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleRemoveAvatar() {
    if (!userId || !profile) return;
    const avatarUrl = profile.avatar_url;
    const key = queryKeys.profile(userId);
    queryClient.setQueryData<typeof profile>(key, (current) =>
      current ? { ...current, avatar_url: null } : current,
    );
    showUndoToast({
      message: 'Profilbilden är borttagen.',
      onUndo: () => queryClient.invalidateQueries({ queryKey: key }),
      onCommit: async () => {
        try {
          await removeAvatar(userId, avatarUrl);
        } catch (error) {
          showToast({ tone: 'error', message: getErrorMessage(error) });
        }
        queryClient.invalidateQueries({ queryKey: key });
      },
    });
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
      message: 'EPA:n och dess bild tas bort. Poster där den är taggad finns kvar, utan taggen.',
      confirmLabel: Common.remove,
    });
    if (!ok) return;
    try {
      await deleteCar(car);
      queryClient.invalidateQueries({ queryKey: queryKeys.cars(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      showToast({ message: 'EPA:n är borttagen.' });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingBottom: tabBarInset }}
          refreshControl={
            <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
          }
        >
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
                onPress={() => setAvatarSheet(true)}
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
                  ) : profileError ? (
                    <View
                      style={[styles.avatarEmpty, { backgroundColor: theme.backgroundElement }]}
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
              {profileError && !profile ? (
                <View style={styles.heroError}>
                  <ThemedText style={styles.center}>{loadError('Profilen')}</ThemedText>
                  <Button
                    label={Common.retry}
                    icon="refresh"
                    variant="secondary"
                    size="sm"
                    loading={profileQuery.isFetching}
                    onPress={() => profileQuery.refetch()}
                  />
                </View>
              ) : profileLoading || !profile ? (
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
              <Stat
                value={cars?.length}
                label={Counts.vehicles}
                hint="Visar dina EPA:or"
                onPress={() => scrollTo('cars')}
              />
              <Stat
                value={friends?.length}
                label={Counts.friends}
                hint="Öppnar Kompisar"
                onPress={() => router.navigate('/friends')}
              />
              <Stat
                value={postCount}
                label={Counts.posts}
                hint="Visar dina poster"
                onPress={() => scrollTo('posts')}
              />
            </View>

            <Button
              label="Redigera profil"
              icon="create-outline"
              variant="secondary"
              disabled={!profile}
              onPress={() => setEditing(true)}
            />

            <View
              style={styles.sectionHeader}
              onLayout={(event) => {
                offsets.current.cars = event.nativeEvent.layout.y;
              }}
            >
              <SectionLabel>{`Mina ${Words.vehicles}`}</SectionLabel>
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
                <CarCard
                  key={car.id}
                  car={car}
                  onPress={() => openCar(car.id)}
                  onMore={() => setSelectedCar(car)}
                />
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
              <ThemedText type="smallBold">Lägg till din första EPA</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.center}>
                Den visas på din profil och kan taggas i poster.
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.carRow}>
              <Skeleton width={CAR_CARD_WIDTH} height={CAR_CARD_WIDTH + 52} radius={Radius.lg} />
              <Skeleton width={CAR_CARD_WIDTH} height={CAR_CARD_WIDTH + 52} radius={Radius.lg} />
            </View>
          )}

          <View
            style={[styles.padded, styles.postsHeader]}
            onLayout={(event) => {
              offsets.current.posts = event.nativeEvent.layout.y;
            }}
          >
            <SectionLabel>{Words.myPosts}</SectionLabel>
            <Button
              label="Skriv"
              icon="create-outline"
              size="sm"
              variant="ghost"
              onPress={() => router.push('/post/new')}
            />
          </View>
          {posts.map((post) => (
            <PostItem key={post.id} post={post} onMore={() => setSelectedPost(post)} />
          ))}
          {myPosts.hasNextPage ? (
            <View style={styles.padded}>
              <Button
                label="Visa fler"
                variant="secondary"
                loading={myPosts.isFetchingNextPage}
                onPress={() => myPosts.fetchNextPage()}
              />
            </View>
          ) : null}
          {myPosts.data && posts.length === 0 ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={[styles.padded, styles.noPosts]}
            >
              Du har inte postat något än. Dina poster syns här och i dina kompisars flöde.
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      <PhotoSourceSheet
        visible={avatarSheet}
        title="Profilbild"
        onClose={() => setAvatarSheet(false)}
        onPick={handlePickAvatar}
        onRemove={profile?.avatar_url ? handleRemoveAvatar : undefined}
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
                  label: 'Visa EPA',
                  icon: 'car-sport-outline',
                  onPress: () => openCar(selectedCar.id),
                },
                {
                  label: 'Redigera EPA',
                  icon: 'create-outline',
                  onPress: () =>
                    router.push({ pathname: '/cars/[id]/edit', params: { id: selectedCar.id } }),
                },
                {
                  label: 'Ta bort EPA',
                  icon: 'trash-outline',
                  destructive: true,
                  onPress: () => handleDeleteCar(selectedCar),
                },
              ]
            : []
        }
      />
      <PostActionsSheet post={selectedPost} onClose={() => setSelectedPost(null)} />
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
  heroError: { alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.two },
  avatarEmpty: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
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
  postsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.four,
  },
  noPosts: { paddingBottom: Spacing.four },
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
