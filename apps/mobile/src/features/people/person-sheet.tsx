import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useFriends, useOutgoingRequests } from '@/features/friends/hooks';
import { carColorHex } from '@/features/map/car-colors';
import { useFriendLocations } from '@/features/map/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/hooks/use-user-id';
import {
  createConversation,
  fetchMyCars,
  fetchProfile,
  friendProfile,
  sendFriendRequest,
  type Car,
  type FriendLocation,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { usePersonSheetStore } from '@/store/person-sheet';
import { openReport } from '@/store/report-sheet';
import { useBlockPerson } from '@/features/moderation/use-block-person';
import { Common, Words } from '@/constants/strings';
import { showToast } from '@/store/toast';
import { successHaptic } from '@/lib/haptics';

export function PersonSheetHost() {
  const userId = usePersonSheetStore((state) => state.userId);
  const close = usePersonSheetStore((state) => state.close);
  if (!userId) return null;
  return <PersonSheet key={userId} personId={userId} onClose={close} />;
}

function PersonSheet({ personId, onClose }: { personId: string; onClose: () => void }) {
  const theme = useTheme();
  const myUserId = useUserId();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const blockPerson = useBlockPerson();

  const { data: profile } = useQuery({
    queryKey: queryKeys.profile(personId),
    queryFn: () => fetchProfile(personId),
  });
  const { data: cars } = useQuery({
    queryKey: queryKeys.cars(personId),
    queryFn: () => fetchMyCars(personId),
  });
  const { data: friends } = useFriends();
  const { data: outgoing } = useOutgoingRequests();
  const { data: locations } = useFriendLocations();

  const isFriend = !!myUserId && !!friends?.some((f) => friendProfile(f, myUserId).id === personId);
  const requested = !!outgoing?.some((r) => r.addressee_id === personId);
  const location = locations?.find((l) => l.user_id === personId) ?? null;
  const name = profile?.display_name ?? '';

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

  async function requestFriend() {
    try {
      await sendFriendRequest(personId);
      successHaptic();
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingRequests(myUserId) });
      showToast({ tone: 'success', message: `Förfrågan skickad till ${name}!` });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  const moderation: SheetAction[] = [
    {
      label: Common.report,
      icon: 'flag-outline',
      disabled: !profile,
      onPress: () => openReport({ type: 'profile', id: personId, userId: personId, name }),
    },
    {
      label: Common.block,
      icon: 'ban-outline',
      destructive: true,
      disabled: !profile,
      onPress: () => blockPerson(personId, name),
    },
  ];

  const primary: SheetAction[] = isFriend
    ? [
        {
          label: 'Chatta',
          icon: 'chatbubble-outline',
          disabled: busy,
          onPress: startChat,
        },
        {
          label: 'Visa på kartan',
          icon: 'map-outline',
          disabled: !location,
          hint: location ? undefined : 'Delar inte sin plats just nu',
          onPress: () => router.navigate({ pathname: '/karta', params: { focus: personId } }),
        },
      ]
    : [
        {
          label: requested ? 'Förfrågan skickad' : Words.addFriend,
          icon: 'person-add-outline',
          disabled: requested || !profile,
          onPress: requestFriend,
        },
      ];
  const actions = [...primary, ...moderation];

  return (
    <ActionSheet
      visible
      onClose={onClose}
      header={
        <View style={styles.header}>
          <View style={styles.identity}>
            {profile ? (
              <Avatar name={name} imageUrl={profile.avatar_url} size={64} />
            ) : (
              <Skeleton width={64} height={64} radius={32} />
            )}
            <View style={styles.identityText}>
              {profile ? (
                <>
                  <ThemedText type="subtitle" numberOfLines={1}>
                    {name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    @{profile.username}
                  </ThemedText>
                </>
              ) : (
                <>
                  <Skeleton width={140} height={22} />
                  <Skeleton width={90} />
                </>
              )}
              {location ? (
                <ThemedText type="caption" style={{ color: theme.brandOnSurface }}>
                  {mapLine(location)}
                </ThemedText>
              ) : null}
            </View>
          </View>
          {profile?.bio ? (
            <ThemedText type="small" numberOfLines={3}>
              {profile.bio}
            </ThemedText>
          ) : null}
          {cars && cars.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cars}
            >
              {cars.map((car) => (
                <CarTag key={car.id} car={car} />
              ))}
            </ScrollView>
          ) : null}
        </View>
      }
      actions={actions}
    />
  );
}

function CarTag({ car }: { car: Car }) {
  const theme = useTheme();
  return (
    <View style={[styles.car, { backgroundColor: theme.background }]}>
      <View style={[styles.carDot, { backgroundColor: carColorHex(car.color) }]} />
      <ThemedText type="caption" numberOfLines={1}>
        {car.nickname ?? `${car.make} ${car.model}`}
      </ThemedText>
    </View>
  );
}

function mapLine(location: FriendLocation) {
  const active =
    location.status_text &&
    (!location.status_expires_at || new Date(location.status_expires_at).getTime() > Date.now());
  const base = location.moving ? 'Kör just nu' : 'På kartan';
  return active ? `${base} · ${location.status_text}` : base;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.three },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  identityText: { flex: 1, gap: Spacing.half },
  cars: { gap: Spacing.two },
  car: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  carDot: { width: 10, height: 10, borderRadius: Radius.pill },
});
