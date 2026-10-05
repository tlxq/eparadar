import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ActionSheet } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { ListRow } from '@/components/list-row';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useBlockUser } from '@/features/friends/hooks';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
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
import { showToast } from '@/store/toast';
import { useAuthStore } from '@/store/auth';

async function confirmBlock(name: string, consequence: string) {
  return confirmDestructive({
    title: `Blockera ${name}?`,
    message: `${consequence} ${name} får inget besked om det.`,
    confirmLabel: 'Blockera',
  });
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

function RequestRow({ request, myUserId }: { request: Friendship; myUserId: string }) {
  const queryClient = useQueryClient();
  const requester = request.requester;
  const block = useBlockUser(myUserId);
  const [sheetOpen, setSheetOpen] = useState(false);

  const respond = useMutation({
    mutationFn: (accept: boolean) => respondToFriendRequest(request.id, accept),
    onSuccess: (_data, accepted) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(myUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests(myUserId) });
      if (accepted) {
        showToast({ tone: 'success', message: `Du och ${requester.display_name} är nu vänner.` });
        maybeRequestNotificationPermission(myUserId);
      }
    },
    onError: () => showToast({ tone: 'error', message: 'Det gick inte att svara på förfrågan.' }),
  });

  return (
    <>
      <ListRow
        title={requester.display_name}
        subtitle={`@${requester.username}`}
        leading={<Avatar name={requester.display_name} imageUrl={requester.avatar_url} size={52} />}
        trailing={
          <View style={styles.requestActions}>
            <Button
              label="Acceptera"
              size="sm"
              loading={respond.isPending && respond.variables === true}
              disabled={respond.isPending}
              onPress={() => respond.mutate(true)}
            />
            <IconButton
              icon="close"
              size={36}
              accessibilityLabel={`Neka ${requester.display_name}`}
              disabled={respond.isPending}
              onPress={() => respond.mutate(false)}
            />
            <IconButton
              icon="ellipsis-horizontal"
              variant="plain"
              size={36}
              accessibilityLabel={`Fler val för ${requester.display_name}`}
              onPress={() => setSheetOpen(true)}
            />
          </View>
        }
      />
      <ActionSheet
        visible={sheetOpen}
        title={requester.display_name}
        onClose={() => setSheetOpen(false)}
        actions={[
          {
            label: 'Blockera',
            icon: 'ban-outline',
            destructive: true,
            onPress: async () => {
              const ok = await confirmBlock(
                requester.display_name,
                `Förfrågan tas bort och ${requester.display_name} kan inte skicka nya vänförfrågningar till dig.`,
              );
              if (ok) block.mutate(requester.id);
            },
          },
        ]}
      />
    </>
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
    onError: () => showToast({ tone: 'error', message: 'Det gick inte att avbryta förfrågan.' }),
  });

  return (
    <ListRow
      title={addressee.display_name}
      subtitle={`@${addressee.username} · väntar på svar`}
      leading={<Avatar name={addressee.display_name} imageUrl={addressee.avatar_url} size={52} />}
      trailing={
        <Button
          label="Avbryt"
          size="sm"
          variant="secondary"
          loading={cancel.isPending}
          onPress={() => cancel.mutate()}
        />
      }
    />
  );
}

function FriendRow({ friendship, myUserId }: { friendship: Friendship; myUserId: string }) {
  const queryClient = useQueryClient();
  const friend = friendProfile(friendship, myUserId);
  const block = useBlockUser(myUserId);
  const [sheetOpen, setSheetOpen] = useState(false);

  const remove = useMutation({
    mutationFn: () => removeFriend(friendship.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(myUserId) });
      showToast({ message: `${friend.display_name} är borttagen från dina vänner.` });
    },
    onError: () => showToast({ tone: 'error', message: 'Det gick inte att ta bort vännen.' }),
  });

  return (
    <>
      <ListRow
        title={friend.display_name}
        subtitle={`@${friend.username}`}
        leading={<Avatar name={friend.display_name} imageUrl={friend.avatar_url} size={52} />}
        trailing={
          <IconButton
            icon="ellipsis-horizontal"
            variant="plain"
            accessibilityLabel={`Fler val för ${friend.display_name}`}
            disabled={remove.isPending || block.isPending}
            onPress={() => setSheetOpen(true)}
          />
        }
      />
      <ActionSheet
        visible={sheetOpen}
        title={friend.display_name}
        onClose={() => setSheetOpen(false)}
        actions={[
          {
            label: 'Ta bort vän',
            icon: 'person-remove-outline',
            destructive: true,
            onPress: () => remove.mutate(),
          },
          {
            label: 'Blockera',
            icon: 'ban-outline',
            destructive: true,
            onPress: async () => {
              const ok = await confirmBlock(
                friend.display_name,
                `${friend.display_name} försvinner från dina vänner och kan inte skicka vänförfrågningar till dig.`,
              );
              if (ok) block.mutate(friend.id);
            },
          },
        ]}
      />
    </>
  );
}

function FriendsSkeleton() {
  return (
    <View style={styles.skeleton}>
      {[0, 1, 2].map((key) => (
        <View key={key} style={styles.skeletonRow}>
          <Skeleton width={52} height={52} radius={26} />
          <View style={styles.skeletonLines}>
            <Skeleton width="45%" />
            <Skeleton width="30%" />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function FriendsScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const tabBarInset = useTabBarInset();

  const {
    data: friends,
    isLoading: friendsLoading,
    isError,
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

  useEffect(() => {
    if (isError) {
      showToast({
        tone: 'error',
        message: 'Kunde inte ladda dina vänner.',
        action: { label: 'Försök igen', onPress: () => refetch() },
      });
    }
  }, [isError, refetch]);

  const friendCount = friends?.length ?? 0;

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={friends ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FriendRow friendship={item} myUserId={userId!} />}
          contentContainerStyle={{ paddingBottom: tabBarInset }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListHeaderComponent={
            <>
              <View style={styles.headerBlock}>
                <ScreenHeader
                  title="Vänner"
                  actions={
                    <IconButton
                      icon="person-add-outline"
                      accessibilityLabel="Lägg till vän"
                      onPress={() => router.push('/friends/add')}
                    />
                  }
                />
              </View>
              {requests && requests.length > 0 ? (
                <View style={styles.section}>
                  <SectionLabel>{`FÖRFRÅGNINGAR · ${requests.length}`}</SectionLabel>
                  {requests.map((request) => (
                    <RequestRow key={request.id} request={request} myUserId={userId!} />
                  ))}
                </View>
              ) : null}
              {outgoingRequests && outgoingRequests.length > 0 ? (
                <View style={styles.section}>
                  <SectionLabel>SKICKADE</SectionLabel>
                  {outgoingRequests.map((request) => (
                    <OutgoingRequestRow key={request.id} request={request} myUserId={userId!} />
                  ))}
                </View>
              ) : null}
              {friendCount > 0 ? (
                <SectionLabel>{`DINA VÄNNER · ${friendCount}`}</SectionLabel>
              ) : null}
            </>
          }
          ListEmptyComponent={
            friendsLoading ? (
              <FriendsSkeleton />
            ) : isError ? null : (
              <EmptyState
                icon="people-outline"
                title="Inga vänner än"
                message="Lägg till folk du träffat på en träff eller som era kompisar redan känner."
                action={{
                  label: 'Lägg till vän',
                  icon: 'person-add-outline',
                  onPress: () => router.push('/friends/add'),
                }}
              />
            )
          }
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerBlock: { paddingHorizontal: Spacing.three },
  section: { marginBottom: Spacing.three },
  sectionLabel: {
    letterSpacing: 0.6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  requestActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  skeleton: { paddingHorizontal: Spacing.three, gap: Spacing.four, paddingTop: Spacing.two },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  skeletonLines: { flex: 1, gap: Spacing.two },
});
