import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { DropdownButton } from '@/components/dropdown-menu';
import { IconButton } from '@/components/icon-button';
import { ListRow } from '@/components/list-row';
import { Skeleton } from '@/components/skeleton';
import { Spacing } from '@/constants/theme';
import { useStartChat } from '@/features/chat/use-start-chat';
import { useUndoableRemoval } from '@/features/friends/use-undoable-removal';
import { useAcceptFriendRequest, useDeclineFriendRequest } from '@/features/friends/hooks';
import { useModerationItems } from '@/features/moderation/use-moderation-items';
import { friendProfile, removeFriend, type Friendship } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { openPerson } from '@/store/person-sheet';
import { Common } from '@/constants/strings';

export function RequestRow({ request, myUserId }: { request: Friendship; myUserId: string }) {
  const requester = request.requester;
  const moderationItems = useModerationItems();
  const accept = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();

  function decline() {
    declineRequest({ requestId: request.id, name: requester.display_name });
  }

  return (
    <ListRow
      title={requester.display_name}
      subtitle={`@${requester.username}`}
      onPress={() => openPerson(requester.id)}
      leading={<Avatar name={requester.display_name} imageUrl={requester.avatar_url} size={52} />}
      trailing={
        <View style={styles.actions}>
          <Button
            label="Acceptera"
            size="sm"
            loading={accept.isPending}
            onPress={() => accept.mutate({ requestId: request.id, name: requester.display_name })}
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
              ...moderationItems({
                report: {
                  type: 'profile',
                  id: requester.id,
                  userId: requester.id,
                  name: requester.display_name,
                },
              }),
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
  const moderationItems = useModerationItems();
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
            items={[
              {
                label: 'Ta bort kompis',
                icon: 'person-remove-outline',
                destructive: true,
                onPress: remove,
              },
              ...moderationItems({
                report: {
                  type: 'profile',
                  id: friend.id,
                  userId: friend.id,
                  name: friend.display_name,
                },
              }),
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
