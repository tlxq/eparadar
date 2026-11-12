import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormScreen } from '@/components/form-screen';
import { ListRow } from '@/components/list-row';
import { SkeletonList } from '@/components/skeleton';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Words, loadError } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createConversation, friendProfile } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { maybeRequestNotificationPermission } from '@/lib/push-notifications';
import { queryKeys } from '@/lib/query-keys';
import { useFriends } from '@/features/friends/hooks';
import { useUserId } from '@/hooks/use-user-id';

type FriendProfile = ReturnType<typeof friendProfile>;

export default function NewChatScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FriendProfile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: friendships, isLoading, isError, refetch } = useFriends();

  const friends = useMemo(
    () =>
      (friendships ?? [])
        .map((friendship) => friendProfile(friendship, userId!))
        .sort((a, b) => a.display_name.localeCompare(b.display_name, 'sv')),
    [friendships, userId],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return friends;
    return friends.filter(
      (friend) =>
        friend.display_name.toLowerCase().includes(needle) ||
        friend.username.toLowerCase().includes(needle),
    );
  }, [friends, query]);

  function toggleSelected(user: FriendProfile) {
    setSelected((current) =>
      current.some((u) => u.id === user.id)
        ? current.filter((u) => u.id !== user.id)
        : [...current, user],
    );
  }

  const mutation = useMutation({
    mutationFn: () =>
      createConversation({
        otherUserIds: selected.map((u) => u.id),
        groupName: selected.length > 1 ? groupName.trim() || null : null,
      }),
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
      router.replace(`/chat/${conversationId}`);
      if (userId) maybeRequestNotificationPermission(userId, 'chat');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <FormScreen
      footer={
        <>
          {error ? <ThemedText type="error">{error}</ThemedText> : null}
          <Button
            label={
              selected.length > 1
                ? `Starta grupp med ${selected.length} ${Words.friends.toLowerCase()}`
                : 'Starta chatt'
            }
            onPress={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={selected.length === 0}
          />
        </>
      }
    >
      {friends.length > 5 ? (
        <TextField
          label="Till"
          placeholder="Sök bland dina kompisar"
          autoCapitalize="none"
          value={query}
          onChangeText={setQuery}
        />
      ) : null}
      {selected.length > 0 ? (
        <View style={styles.chips}>
          {selected.map((user) => (
            <Pressable
              key={user.id}
              accessibilityRole="button"
              accessibilityLabel={`Ta bort ${user.display_name}`}
              onPress={() => toggleSelected(user)}
              style={[styles.chip, { backgroundColor: theme.backgroundElement }]}
            >
              <Avatar name={user.display_name} imageUrl={user.avatar_url} size={24} />
              <ThemedText type="smallBold">{user.display_name}</ThemedText>
              <Ionicons name="close" size={16} color={theme.textSecondary} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {selected.length > 1 ? (
        <TextField
          label="Gruppnamn (valfritt)"
          placeholder="Traktorgänget"
          value={groupName}
          onChangeText={setGroupName}
          maxLength={40}
        />
      ) : null}
      {isLoading ? (
        <SkeletonList style={styles.skeleton} />
      ) : isError ? (
        <ErrorState message={loadError('Kompisarna')} onRetry={refetch} />
      ) : friends.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Inga kompisar än"
          message="Du kan chatta med dina kompisar. Lägg till någon du har träffat först."
          action={{
            label: Words.addFriend,
            icon: 'person-add-outline',
            onPress: () => router.replace('/friends/add'),
          }}
        />
      ) : results.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Ingen hittades.
        </ThemedText>
      ) : (
        <View style={styles.results}>
          {results.map((item) => {
            const isSelected = selected.some((u) => u.id === item.id);
            return (
              <ListRow
                key={item.id}
                title={item.display_name}
                subtitle={`@${item.username}`}
                leading={<Avatar name={item.display_name} imageUrl={item.avatar_url} size={44} />}
                trailing={
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={isSelected ? theme.brand : theme.border}
                  />
                }
                accessibilityLabel={`${isSelected ? 'Avmarkera' : 'Välj'} ${item.display_name}`}
                onPress={() => toggleSelected(item)}
              />
            );
          })}
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  skeleton: { paddingHorizontal: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 36,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.two + Spacing.one,
    borderRadius: Radius.pill,
  },
  results: { marginHorizontal: -Spacing.three },
});
