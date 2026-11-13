import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { DropdownButton, type MenuItem } from '@/components/dropdown-menu';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ScreenHeader } from '@/components/screen-header';
import { ScreenBackground } from '@/components/screen-background';
import { SectionLabel } from '@/components/section-label';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Counts, loadError, plural, Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useOutgoingRequests, useSendFriendRequest } from '@/features/friends/hooks';
import { carColorHex } from '@/features/map/car-colors';
import { useFriendLocations } from '@/features/map/hooks';
import { latestCarColor } from '@/features/map/markers';
import { useModerationItems } from '@/features/moderation/use-moderation-items';
import { PostGrid, PostGridSkeleton } from '@/features/profile/components/post-grid';
import { CarCard, Stat } from '@/features/profile/components/profile-parts';
import {
  useIsFriend,
  useMutualFriends,
  usePersonCars,
  usePersonPostCount,
  usePersonPosts,
  usePersonProfile,
} from '@/features/profile/hooks';
import { useHeaderReveal } from '@/hooks/use-header-reveal';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/hooks/use-user-id';
import { createConversation } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { openCar, openProfile } from '@/store/person-sheet';
import { showToast } from '@/store/toast';

const AVATAR_SIZE = 96;
const BIG_CAR_WIDTH = 240;
const TITLE_REVEAL_Y = 140;

type Section = 'cars' | 'mutual' | 'posts';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const myUserId = useUserId();
  if (id && id === myUserId) return <Redirect href="/profile" />;
  return <PersonProfile key={id} personId={id} />;
}

function PersonProfile({ personId }: { personId: string }) {
  const theme = useTheme();
  const myUserId = useUserId();
  const queryClient = useQueryClient();
  const moderationItems = useModerationItems();
  const sendRequest = useSendFriendRequest();
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<Section, number>>({ cars: 0, mutual: 0, posts: 0 });
  const [busy, setBusy] = useState(false);
  const reveal = useHeaderReveal(TITLE_REVEAL_Y);

  const profileQuery = usePersonProfile(personId);
  const profile = profileQuery.data;
  const { isFriend } = useIsFriend(personId);
  const carsQuery = usePersonCars(personId, isFriend);
  const cars = carsQuery.data;
  const mutualQuery = useMutualFriends(personId, isFriend);
  const postCountQuery = usePersonPostCount(personId, isFriend);
  const postsQuery = usePersonPosts(personId, isFriend);
  const posts = useMemo(() => postsQuery.data?.pages.flat() ?? [], [postsQuery.data]);
  const { data: outgoing } = useOutgoingRequests();
  const { data: locations } = useFriendLocations();
  const pull = usePullRefresh(() =>
    Promise.all([
      profileQuery.refetch(),
      ...(isFriend
        ? [
            carsQuery.refetch(),
            mutualQuery.refetch(),
            postCountQuery.refetch(),
            postsQuery.refetch(),
          ]
        : []),
    ]),
  );

  const name = profile?.display_name ?? '';
  const glow = carColorHex(latestCarColor(cars));
  const requested = !!outgoing?.some((r) => r.addressee_id === personId);
  const location = locations?.find((l) => l.user_id === personId) ?? null;

  const hasPostsSection = postsQuery.isLoading || postsQuery.isError || posts.length > 0;

  function scrollTo(section: Section) {
    scrollRef.current?.scrollTo({ y: Math.max(0, offsets.current[section] - Spacing.three) });
  }

  async function startChat() {
    setBusy(true);
    try {
      const conversationId = await createConversation({ otherUserIds: [personId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(myUserId) });
      router.navigate(`/chat/${conversationId}`);
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  function requestFriend() {
    sendRequest.mutate({ userId: personId, name });
  }

  const menu: MenuItem[] = moderationItems({
    report: { type: 'profile', id: personId, userId: personId, name },
    disabled: !profile,
    onBlocked: () => router.back(),
  });

  if (profileQuery.isError && !profile) {
    return (
      <Shell title="" menu={[]}>
        <ErrorState message={loadError('Profilen')} onRetry={profileQuery.refetch} />
      </Shell>
    );
  }

  if (profileQuery.isSuccess && !profile) {
    return (
      <Shell title="" menu={[]}>
        <EmptyState
          icon="person-outline"
          title="Profilen finns inte"
          message="Kontot kan ha tagits bort."
        />
      </Shell>
    );
  }

  return (
    <Shell title={name} menu={menu} glow={glow} titleVisible={reveal.revealed}>
      <ScrollView
        ref={scrollRef}
        onScroll={reveal.onScroll}
        scrollEventThrottle={reveal.scrollEventThrottle}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />}
      >
        <View style={styles.padded}>
          <View style={styles.hero}>
            <View
              style={[
                styles.ring,
                { borderColor: glow, shadowColor: glow, backgroundColor: theme.background },
              ]}
            >
              {profile ? (
                <Avatar name={name} imageUrl={profile.avatar_url} size={AVATAR_SIZE} />
              ) : (
                <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} radius={AVATAR_SIZE / 2} />
              )}
            </View>
            {profile ? (
              <>
                <ThemedText type="subtitle" style={styles.center}>
                  {name}
                </ThemedText>
                {isFriend ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    @{profile.username}
                  </ThemedText>
                ) : null}
                {isFriend && profile.bio ? (
                  <ThemedText style={[styles.center, styles.bio]}>{profile.bio}</ThemedText>
                ) : null}
              </>
            ) : (
              <View style={styles.heroSkeleton}>
                <Skeleton width={160} height={22} />
                <Skeleton width={100} />
              </View>
            )}
          </View>

          {isFriend ? (
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button
                  label="Chatta"
                  icon="chatbubble-outline"
                  loading={busy}
                  onPress={startChat}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label="Visa på kartan"
                  icon="map-outline"
                  variant="secondary"
                  disabled={!location}
                  onPress={() =>
                    router.navigate({ pathname: '/karta', params: { focus: personId } })
                  }
                />
              </View>
            </View>
          ) : (
            <Button
              label={requested ? 'Förfrågan skickad' : Words.addFriend}
              icon="person-add-outline"
              disabled={requested || !profile}
              onPress={requestFriend}
            />
          )}

          {isFriend ? (
            <View style={styles.stats}>
              <Stat
                value={cars?.length}
                label={Counts.vehicles}
                hint={`Visar ${Words.vehicles}`}
                onPress={() => scrollTo('cars')}
              />
              <Stat
                value={mutualQuery.data?.length}
                label={(count) => plural(count, 'gemensam kompis', 'gemensamma kompisar')}
                hint="Visar gemensamma kompisar"
                onPress={() => scrollTo('mutual')}
              />
              <Stat
                value={postCountQuery.data}
                label={Counts.posts}
                hint="Visar posterna"
                onPress={hasPostsSection ? () => scrollTo('posts') : undefined}
              />
            </View>
          ) : null}
        </View>

        {isFriend ? (
          <View
            onLayout={(event) => {
              offsets.current.cars = event.nativeEvent.layout.y;
            }}
            style={styles.section}
          >
            <SectionLabel style={styles.label}>{Words.vehicles}</SectionLabel>
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
                    width={BIG_CAR_WIDTH}
                    onPress={() => openCar(car.id)}
                  />
                ))}
              </ScrollView>
            ) : cars ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
                {`${name || 'Hen'} har inga ${Words.vehicles} än.`}
              </ThemedText>
            ) : carsQuery.isError ? (
              <ErrorState message={loadError('EPA:orna')} onRetry={carsQuery.refetch} />
            ) : (
              <View style={styles.carRow}>
                <Skeleton width={BIG_CAR_WIDTH} height={BIG_CAR_WIDTH + 52} radius={Radius.lg} />
              </View>
            )}
          </View>
        ) : null}

        {isFriend ? (
          <>
            <View
              onLayout={(event) => {
                offsets.current.mutual = event.nativeEvent.layout.y;
              }}
              style={styles.section}
            >
              <SectionLabel style={styles.label}>Gemensamma kompisar</SectionLabel>
              {mutualQuery.data && mutualQuery.data.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mutualRow}
                >
                  {mutualQuery.data.map((friend) => (
                    <Pressable
                      key={friend.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Visa ${friend.display_name}`}
                      onPress={() => openProfile(friend.id)}
                      style={({ pressed }) => [styles.mutual, pressed && styles.pressed]}
                    >
                      <Avatar name={friend.display_name} imageUrl={friend.avatar_url} size={52} />
                      <ThemedText type="caption" numberOfLines={1} style={styles.center}>
                        {friend.display_name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : mutualQuery.data ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
                  Inga gemensamma kompisar än.
                </ThemedText>
              ) : (
                <View style={styles.mutualRow}>
                  {[0, 1, 2, 3].map((index) => (
                    <Skeleton key={index} width={52} height={52} radius={26} />
                  ))}
                </View>
              )}
            </View>

            {hasPostsSection ? (
              <View
                onLayout={(event) => {
                  offsets.current.posts = event.nativeEvent.layout.y;
                }}
                style={styles.section}
              >
                <SectionLabel style={styles.label}>Poster</SectionLabel>
                {postsQuery.isLoading ? (
                  <PostGridSkeleton />
                ) : postsQuery.isError && posts.length === 0 ? (
                  <ErrorState message={loadError('Posterna')} onRetry={postsQuery.refetch} />
                ) : (
                  <PostGrid posts={posts} />
                )}
                {postsQuery.hasNextPage ? (
                  <View style={styles.padded}>
                    <Button
                      label="Visa fler"
                      variant="secondary"
                      loading={postsQuery.isFetchingNextPage}
                      onPress={() => postsQuery.fetchNextPage()}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : profile ? (
          <View
            style={[styles.locked, { backgroundColor: theme.backgroundElement }]}
            accessibilityRole="text"
          >
            <Ionicons name="lock-closed-outline" size={22} color={theme.textSecondary} />
            <View style={styles.flex}>
              <ThemedText type="smallBold">Ni är inte kompisar än</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {`EPA:or, poster, bio och kompisar syns när du och ${name} är kompisar.`}
              </ThemedText>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Shell>
  );
}

type ShellProps = {
  title: string;
  menu: MenuItem[];
  glow?: string;
  titleVisible?: boolean;
  children: ReactNode;
};

function Shell({ title, menu, glow, titleVisible, children }: ShellProps) {
  return (
    <ScreenBackground style={styles.container}>
      {glow ? (
        <LinearGradient
          colors={[`${glow}59`, `${glow}00`]}
          style={styles.glow}
          pointerEvents="none"
        />
      ) : null}
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader
          title={title}
          titleVisible={titleVisible}
          actions={
            menu.length > 0 ? (
              <DropdownButton items={menu} accessibilityLabel={`Fler val för ${title}`} />
            ) : null
          }
        />
        {children}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  scroll: { paddingBottom: Spacing.six, gap: Spacing.four },
  padded: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  hero: { alignItems: 'center', gap: Spacing.one },
  heroSkeleton: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.two },
  ring: {
    borderWidth: 3,
    borderRadius: (AVATAR_SIZE + 12) / 2,
    padding: 3,
    marginBottom: Spacing.two,
    shadowOpacity: 0.7,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  center: { textAlign: 'center' },
  bio: { maxWidth: 320, marginTop: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: Spacing.two },
  section: { gap: Spacing.two },
  label: { paddingHorizontal: Spacing.three },
  note: { paddingHorizontal: Spacing.three },
  carRow: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three },
  mutualRow: { flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three },
  mutual: { width: 64, alignItems: 'center', gap: Spacing.one },
  pressed: { opacity: 0.8 },
  locked: {
    marginHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
});
