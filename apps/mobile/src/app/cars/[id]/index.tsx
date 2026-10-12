import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { DropdownButton, type MenuItem } from '@/components/dropdown-menu';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ModalHeader } from '@/components/modal-header';
import { ScreenBackground } from '@/components/screen-background';
import { SectionLabel } from '@/components/section-label';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Common, Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { PostActionsSheet } from '@/features/feed/components/post-actions-sheet';
import { PostItem } from '@/features/feed/components/post-item';
import { CAR_COLORS, carColorHex } from '@/features/map/car-colors';
import { useBlockPerson } from '@/features/moderation/use-block-person';
import { carName } from '@/features/profile/components/profile-parts';
import { useCar, useCarPosts, useIsFriend, usePersonProfile } from '@/features/profile/hooks';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/hooks/use-user-id';
import { deleteCar, type Post } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { openProfile } from '@/store/person-sheet';
import { openReport } from '@/store/report-sheet';
import { showToast } from '@/store/toast';

export default function CarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const blockPerson = useBlockPerson();
  const carQuery = useCar(id);
  const car = carQuery.data;
  const ownerId = car?.owner_id;
  const isOwner = !!car && car.owner_id === userId;
  const { isFriend } = useIsFriend(ownerId);
  const canSeePosts = isOwner || isFriend;
  const ownerQuery = usePersonProfile(ownerId);
  const owner = ownerQuery.data;
  const postsQuery = useCarPosts(id, canSeePosts);
  const posts = useMemo(() => postsQuery.data?.pages.flat() ?? [], [postsQuery.data]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const pull = usePullRefresh(() =>
    Promise.all([carQuery.refetch(), ownerQuery.refetch(), postsQuery.refetch()]),
  );

  const name = car ? carName(car) : '';
  const ownerName = owner?.display_name ?? '';
  const colorLabel = CAR_COLORS.find((color) => color.key === car?.color)?.label ?? 'Standard';

  async function handleDelete() {
    if (!car) return;
    const ok = await confirmDestructive({
      title: `Ta bort ${name}?`,
      message: 'EPA:n och dess bild tas bort. Poster där den är taggad finns kvar, utan taggen.',
      confirmLabel: Common.remove,
    });
    if (!ok) return;
    try {
      await deleteCar(car);
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendLocations(userId) });
      showToast({ message: 'EPA:n är borttagen.' });
      router.back();
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  const menu: MenuItem[] = !car
    ? []
    : isOwner
      ? [
          {
            label: 'Redigera EPA',
            icon: 'create-outline',
            onPress: () => router.push({ pathname: '/cars/[id]/edit', params: { id: car.id } }),
          },
          {
            label: 'Ta bort EPA',
            icon: 'trash-outline',
            destructive: true,
            onPress: handleDelete,
          },
        ]
      : [
          {
            label: Common.report,
            icon: 'flag-outline',
            disabled: !owner,
            onPress: () =>
              openReport({
                type: 'profile',
                id: car.owner_id,
                userId: car.owner_id,
                name: ownerName,
              }),
          },
          {
            label: Common.block,
            icon: 'ban-outline',
            destructive: true,
            disabled: !owner,
            onPress: async () => {
              if (await blockPerson(car.owner_id, ownerName)) router.back();
            },
          },
        ];

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ModalHeader
          title={name || Words.vehicle}
          variant="back"
          actions={
            menu.length > 0 ? (
              <DropdownButton items={menu} accessibilityLabel={`Fler val för ${name}`} />
            ) : null
          }
        />
        {carQuery.isLoading ? (
          <View style={styles.padded}>
            <Skeleton width="100%" height={260} radius={Radius.lg} />
            <Skeleton width={180} height={22} />
            <Skeleton width="100%" height={120} radius={Radius.lg} />
          </View>
        ) : carQuery.isError ? (
          <ErrorState
            message="EPA:n gick inte att ladda. Kolla nätet och testa igen."
            onRetry={carQuery.refetch}
          />
        ) : !car ? (
          <EmptyState
            icon="car-sport-outline"
            title="EPA:n finns inte längre"
            message="Den kan ha tagits bort av ägaren."
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={
              <RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} />
            }
          >
            <View style={styles.padded}>
              <View
                style={[
                  styles.photo,
                  {
                    backgroundColor: theme.backgroundElement,
                    shadowColor: carColorHex(car.color),
                  },
                ]}
              >
                {car.photo_url ? (
                  <Image
                    source={{ uri: car.photo_url }}
                    style={StyleSheet.absoluteFill}
                    accessibilityLabel={`Bild på ${name}`}
                  />
                ) : (
                  <Ionicons name="car-sport-outline" size={72} color={theme.textSecondary} />
                )}
              </View>
              <View style={styles.titleBlock}>
                <ThemedText type="title">{name}</ThemedText>
                {car.nickname ? (
                  <ThemedText themeColor="textSecondary">{`${car.make} ${car.model}`}</ThemedText>
                ) : null}
              </View>
              <View style={[styles.details, { backgroundColor: theme.backgroundElement }]}>
                <Detail label="Märke" value={car.make} />
                <Detail label="Modell" value={car.model} />
                <Detail label="Årsmodell" value={car.year ? String(car.year) : '–'} />
                <Detail
                  label="Färg på kartan"
                  value={colorLabel}
                  dot={carColorHex(car.color)}
                  last
                />
              </View>
              {!isOwner ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Visa ${ownerName}s profil`}
                  disabled={!owner}
                  onPress={() => openProfile(car.owner_id)}
                  style={({ pressed }) => [
                    styles.ownerRow,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}
                >
                  {owner ? (
                    <Avatar name={ownerName} imageUrl={owner.avatar_url} size={40} />
                  ) : (
                    <Skeleton width={40} height={40} radius={20} />
                  )}
                  <View style={styles.flex}>
                    <ThemedText type="caption" themeColor="textSecondary">
                      Ägare
                    </ThemedText>
                    <ThemedText type="headline" numberOfLines={1}>
                      {ownerName}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                </Pressable>
              ) : null}
              <View style={styles.sectionHeader}>
                <SectionLabel>Bygglogg</SectionLabel>
                {isOwner ? (
                  <Button
                    label={Words.publishPost}
                    icon="create-outline"
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      router.push({ pathname: '/post/new', params: { carId: car.id } })
                    }
                  />
                ) : null}
              </View>
            </View>
            {!canSeePosts ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
                {`Bli kompisar med ${ownerName || 'ägaren'} för att se poster om ${name}.`}
              </ThemedText>
            ) : postsQuery.isLoading ? (
              <View style={styles.padded}>
                <Skeleton width="100%" height={96} radius={Radius.lg} />
                <Skeleton width="100%" height={96} radius={Radius.lg} />
              </View>
            ) : postsQuery.isError && posts.length === 0 ? (
              <ErrorState
                message="Posterna gick inte att ladda. Kolla nätet och testa igen."
                onRetry={postsQuery.refetch}
              />
            ) : posts.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
                {isOwner
                  ? `Inga poster om ${name} än. Tagga den när du postar så hamnar de här.`
                  : `Inga poster om ${name} än.`}
              </ThemedText>
            ) : (
              <>
                {posts.map((post) => (
                  <PostItem key={post.id} post={post} onMore={() => setSelectedPost(post)} />
                ))}
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
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
      <PostActionsSheet post={selectedPost} onClose={() => setSelectedPost(null)} />
    </ScreenBackground>
  );
}

type DetailProps = { label: string; value: string; dot?: string; last?: boolean };

function Detail({ label, value, dot, last }: DetailProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.detail,
        !last && {
          borderBottomColor: theme.separator,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.detailValue}>
        {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
        <ThemedText type="smallBold">{value}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: Spacing.six },
  padded: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  titleBlock: { gap: Spacing.half },
  details: { borderRadius: Radius.lg, paddingHorizontal: Spacing.three },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two + Spacing.half,
  },
  detailValue: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dot: { width: 12, height: 12, borderRadius: Radius.pill },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  note: { paddingHorizontal: Spacing.three },
});
