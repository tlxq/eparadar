import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { DropdownButton } from '@/components/dropdown-menu';
import { IconButton } from '@/components/icon-button';
import { ListRow } from '@/components/list-row';
import { Skeleton } from '@/components/skeleton';
import { Spacing } from '@/constants/theme';
import { useStartChat } from '@/features/chat/use-start-chat';
import { useBlockUser } from '@/features/friends/hooks';
import { friendProfile, removeFriend, respondToFriendRequest, type Friendship } from '@/lib/api';
import { maybeRequestNotificationPermission } from '@/lib/push-notifications';
import { queryKeys } from '@/lib/query-keys';
import { openPerson } from '@/store/person-sheet';
import { openReport } from '@/store/report-sheet';
import { usePendingRemovals } from '@/store/pending-removals';
import { showToast, showUndoToast } from '@/store/toast';
import { confirmDestructive } from '@/lib/confirm';
import { blockedText, Common } from '@/constants/strings';
import { successHaptic } from '@/lib/haptics';

async function confirmBlock(name: string) {
  return confirmDestructive({
    title: `Blockera ${name}?`,
    message: blockedText(name),
    confirmLabel: Common.block,
    icon: 'ban-outline',
  });
}

function useUndoableRemoval(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();

  return function removeWithUndo({
    id,
    message,
    commit,
    errorMessage,
  }: {
    id: string;
    message: string;
    commit: () => Promise<void>;
    errorMessage: string;
  }) {
    const { hide, show } = usePendingRemovals.getState();
    hide(id);
    showUndoToast({
      message,
      onUndo: () => show(id),
      onCommit: async () => {
        try {
          await commit();
          await queryClient.invalidateQueries({ queryKey });
        } catch {
          showToast({ tone: 'error', message: errorMessage });
        } finally {
          show(id);
        }
      },
    });
  };
}

export function RequestRow({ request, myUserId }: { request: Friendship; myUserId: string }) {
  const queryClient = useQueryClient();
  const requester = request.requester;
  const block = useBlockUser();
  const removeWithUndo = useUndoableRemoval(queryKeys.friendRequests(myUserId));

  const accept = useMutation({
    mutationFn: () => respondToFriendRequest(request.id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(myUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests(myUserId) });
      successHaptic();
      showToast({ tone: 'success', message: `Du och ${requester.display_name} är kompisar nu!` });
      maybeRequestNotificationPermission(myUserId, 'friend_accepted');
    },
    onError: () =>
      showToast({ tone: 'error', message: 'Det gick inte att svara på förfrågan. Testa igen!' }),
  });

  function decline() {
    removeWithUndo({
      id: request.id,
      message: `Du nekade ${requester.display_name}.`,
      commit: () => respondToFriendRequest(request.id, false),
      errorMessage: 'Det gick inte att neka förfrågan. Testa igen!',
    });
  }

  return (
    <ListRow
      title={requester.display_name}
      subtitle={`@${requester.username}`}
      leading={<Avatar name={requester.display_name} imageUrl={requester.avatar_url} size={52} />}
      trailing={
        <View style={styles.actions}>
          <Button
            label="Acceptera"
            size="sm"
            loading={accept.isPending}
            onPress={() => accept.mutate()}
          />
          <Button
            label="Neka"
            size="sm"
            variant="secondary"
            disabled={accept.isPending}
            accessibilityLabel={`Neka ${requester.display_name}`}
            onPress={decline}
          />
          <DropdownButton
            variant="plain"
            size={36}
            accessibilityLabel={`Fler val för ${requester.display_name}`}
            disabled={accept.isPending}
            items={[
              {
                label: Common.report,
                icon: 'flag-outline',
                onPress: () =>
                  openReport({
                    type: 'profile',
                    id: requester.id,
                    userId: requester.id,
                    name: requester.display_name,
                  }),
              },
              {
                label: Common.block,
                icon: 'ban-outline',
                destructive: true,
                onPress: async () => {
                  const ok = await confirmBlock(requester.display_name);
                  if (ok) block.mutate(requester.id);
                },
              },
            ]}
          />
        </View>
      }
    />
  );
}

export function OutgoingRequestRow({
  request,
  myUserId,
}: {
  request: Friendship;
  myUserId: string;
}) {
  const addressee = request.addressee;
  const removeWithUndo = useUndoableRemoval(queryKeys.outgoingRequests(myUserId));

  function cancel() {
    removeWithUndo({
      id: request.id,
      message: `Förfrågan till ${addressee.display_name} är borttagen.`,
      commit: () => removeFriend(request.id),
      errorMessage: 'Det gick inte att avbryta förfrågan. Testa igen!',
    });
  }

  return (
    <ListRow
      title={addressee.display_name}
      subtitle={`@${addressee.username} · väntar på svar`}
      leading={<Avatar name={addressee.display_name} imageUrl={addressee.avatar_url} size={52} />}
      trailing={
        <Button
          label={Common.cancel}
          size="sm"
          variant="secondary"
          accessibilityLabel={`Avbryt förfrågan till ${addressee.display_name}`}
          onPress={cancel}
        />
      }
    />
  );
}

export function FriendRow({ friendship, myUserId }: { friendship: Friendship; myUserId: string }) {
  const friend = friendProfile(friendship, myUserId);
  const block = useBlockUser();
  const { startChat, busy } = useStartChat();
  const removeWithUndo = useUndoableRemoval(queryKeys.friends(myUserId));

  function remove() {
    removeWithUndo({
      id: friendship.id,
      message: `${friend.display_name} är inte längre din kompis.`,
      commit: () => removeFriend(friendship.id),
      errorMessage: 'Det gick inte att ta bort kompisen. Testa igen!',
    });
  }

  return (
    <ListRow
      title={friend.display_name}
      subtitle={`@${friend.username}`}
      onPress={() => openPerson(friend.id)}
      leading={<Avatar name={friend.display_name} imageUrl={friend.avatar_url} size={52} />}
      trailing={
        <View style={styles.actions}>
          <IconButton
            icon="chatbubble-outline"
            accessibilityLabel={`Chatta med ${friend.display_name}`}
            disabled={busy}
            onPress={() => startChat(friend.id)}
          />
          <DropdownButton
            variant="plain"
            accessibilityLabel={`Fler val för ${friend.display_name}`}
            disabled={block.isPending}
            items={[
              {
                label: 'Ta bort kompis',
                icon: 'person-remove-outline',
                destructive: true,
                onPress: remove,
              },
              {
                label: Common.block,
                icon: 'ban-outline',
                destructive: true,
                onPress: async () => {
                  const ok = await confirmBlock(friend.display_name);
                  if (ok) block.mutate(friend.id);
                },
              },
            ]}
          />
        </View>
      }
    />
  );
}

export function FriendsSkeleton() {
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

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  skeleton: { paddingHorizontal: Spacing.three, gap: Spacing.four, paddingTop: Spacing.two },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  skeletonLines: { flex: 1, gap: Spacing.two },
});
