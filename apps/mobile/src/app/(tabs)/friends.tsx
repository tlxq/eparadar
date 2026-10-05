import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useBlockUser } from '@/features/friends/hooks';
import {
  fetchFriends,
  fetchOutgoingRequests,
  fetchPendingRequests,
  friendProfile,
  removeFriend,
  respondToFriendRequest,
  type Friendship,
} from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { maybeRequestNotificationPermission } from '@/lib/push-notifications';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

const LINK_HIT_SLOP = 12;

async function confirmBlock(name: string, consequence: string) {
  return confirmDestructive({
    title: `Blockera ${name}?`,
    message: `${consequence} ${name} får inget besked om det.`,
    confirmLabel: 'Blockera',
  });
}

function RequestRow({ request, myUserId }: { request: Friendship; myUserId: string }) {
  const queryClient = useQueryClient();
  const requester = request.requester;
  const block = useBlockUser(myUserId);

  const respond = useMutation({
    mutationFn: (accept: boolean) => respondToFriendRequest(request.id, accept),
    onSuccess: (_data, accepted) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(myUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests(myUserId) });
      if (accepted) maybeRequestNotificationPermission(myUserId);
    },
  });

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Avatar name={requester.display_name} imageUrl={requester.avatar_url} />
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{requester.display_name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          @{requester.username}
        </ThemedText>
      </View>
      <View style={styles.requestActions}>
        <Button
          label="Acceptera"
          tone="success"
          loading={respond.isPending && respond.variables === true}
          disabled={respond.isPending}
          onPress={() => respond.mutate(true)}
        />
        <Button
          label="Neka"
          tone="danger"
          variant="secondary"
          loading={respond.isPending && respond.variables === false}
          disabled={respond.isPending}
          onPress={() => respond.mutate(false)}
        />
      </View>
      <Pressable
        hitSlop={LINK_HIT_SLOP}
        disabled={block.isPending}
        onPress={async () => {
          const ok = await confirmBlock(
            requester.display_name,
            `Förfrågan tas bort och ${requester.display_name} kan inte skicka nya vänförfrågningar till dig.`,
          );
          if (ok) block.mutate(requester.id);
        }}
      >
        <ThemedText type="link" themeColor="danger">
          Blockera
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function OutgoingRequestRow({ request, myUserId }: { request: Friendship; myUserId: string }) {
  const queryClient = useQueryClient();
  const addressee = request.addressee;

  const cancel = useMutation({
    mutationFn: () => removeFriend(request.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingRequests(myUserId) });
    },
  });

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Avatar name={addressee.display_name} imageUrl={addressee.avatar_url} />
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{addressee.display_name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          @{addressee.username} · väntar på svar
        </ThemedText>
      </View>
      <Pressable
        hitSlop={LINK_HIT_SLOP}
        onPress={() => cancel.mutate()}
        disabled={cancel.isPending}
      >
        <ThemedText type="link" themeColor="danger">
          Avbryt
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function FriendRow({ friendship, myUserId }: { friendship: Friendship; myUserId: string }) {
  const queryClient = useQueryClient();
  const friend = friendProfile(friendship, myUserId);
  const block = useBlockUser(myUserId);

  const remove = useMutation({
    mutationFn: () => removeFriend(friendship.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(myUserId) });
    },
  });

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Avatar name={friend.display_name} imageUrl={friend.avatar_url} />
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{friend.display_name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          @{friend.username}
        </ThemedText>
      </View>
      <View style={styles.friendActions}>
        <Pressable
          hitSlop={LINK_HIT_SLOP}
          onPress={() => remove.mutate()}
          disabled={remove.isPending}
        >
          <ThemedText type="link" themeColor="danger">
            Ta bort
          </ThemedText>
        </Pressable>
        <Pressable
          hitSlop={LINK_HIT_SLOP}
          disabled={block.isPending}
          onPress={async () => {
            const ok = await confirmBlock(
              friend.display_name,
              `${friend.display_name} försvinner från dina vänner och kan inte skicka vänförfrågningar till dig.`,
            );
            if (ok) block.mutate(friend.id);
          }}
        >
          <ThemedText type="link" themeColor="danger">
            Blockera
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

export default function FriendsScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);

  const {
    data: friends,
    isLoading: friendsLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: queryKeys.friends(userId),
    queryFn: () => fetchFriends(userId!),
    enabled: !!userId,
  });

  const { data: requests } = useQuery({
    queryKey: queryKeys.friendRequests(userId),
    queryFn: () => fetchPendingRequests(userId!),
    enabled: !!userId,
  });

  const { data: outgoingRequests } = useQuery({
    queryKey: queryKeys.outgoingRequests(userId),
    queryFn: () => fetchOutgoingRequests(userId!),
    enabled: !!userId,
  });

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title">Vänner</ThemedText>
          <Button
            label="Lägg till vän"
            icon="person-add-outline"
            onPress={() => router.push('/friends/add')}
          />
        </View>
        <FlatList
          data={friends ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FriendRow friendship={item} myUserId={userId!} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListHeaderComponent={
            <>
              {requests && requests.length > 0 ? (
                <View style={styles.requestsSection}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Väntande förfrågningar
                  </ThemedText>
                  {requests.map((request) => (
                    <RequestRow key={request.id} request={request} myUserId={userId!} />
                  ))}
                </View>
              ) : null}
              {outgoingRequests && outgoingRequests.length > 0 ? (
                <View style={styles.requestsSection}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Skickade förfrågningar
                  </ThemedText>
                  {outgoingRequests.map((request) => (
                    <OutgoingRequestRow key={request.id} request={request} myUserId={userId!} />
                  ))}
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            !friendsLoading ? (
              <ThemedText themeColor="textSecondary">Inga vänner än.</ThemedText>
            ) : null
          }
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  list: { gap: Spacing.two, paddingBottom: Spacing.four },
  requestsSection: { gap: Spacing.two, marginBottom: Spacing.four },
  requestActions: { gap: Spacing.two },
  friendActions: { gap: Spacing.two, alignItems: 'flex-end' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowText: { flex: 1, gap: Spacing.half },
});
