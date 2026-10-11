import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActionSheet } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { ListRow } from '@/components/list-row';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useBlockUser } from '@/features/friends/hooks';
import { friendProfile, removeFriend, respondToFriendRequest, type Friendship } from '@/lib/api';
import { maybeRequestNotificationPermission } from '@/lib/push-notifications';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { confirmDestructive } from '@/lib/confirm';

async function confirmBlock(name: string, consequence: string) {
  return confirmDestructive({
    title: `Blockera ${name}?`,
    message: `${consequence} ${name} får inget besked om det.`,
    confirmLabel: 'Blockera',
  });
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
      {children}
    </ThemedText>
  );
}

export function RequestRow({ request, myUserId }: { request: Friendship; myUserId: string }) {
  const queryClient = useQueryClient();
  const requester = request.requester;
  const block = useBlockUser();
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

export function OutgoingRequestRow({
  request,
  myUserId,
}: {
  request: Friendship;
  myUserId: string;
}) {
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

export function FriendRow({ friendship, myUserId }: { friendship: Friendship; myUserId: string }) {
  const queryClient = useQueryClient();
  const friend = friendProfile(friendship, myUserId);
  const block = useBlockUser();
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
