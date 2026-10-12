import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
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
import { Words } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/hooks/use-user-id';
import { addConversationMembers, friendProfile } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { useConversation } from '@/features/chat/hooks';
import { useFriends } from '@/features/friends/hooks';

type FriendProfile = ReturnType<typeof friendProfile>;

function addedToast(people: FriendProfile[]) {
  const names = people.map((person) => person.display_name.split(' ')[0]);
  if (names.length === 1) return `${names[0]} är med i gruppen nu!`;
  return `${names.slice(0, -1).join(', ')} och ${names[names.length - 1]} är med i gruppen nu!`;
}

export default function AddMembersScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FriendProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: conversation } = useConversation(id);
  const { data: friendships, isLoading, isError, refetch } = useFriends();

  const candidates = useMemo(() => {
    const memberIds = new Set(
      (conversation?.conversation_members ?? []).map((member) => member.user_id),
    );
    return (friendships ?? [])
      .map((friendship) => friendProfile(friendship, userId!))
      .filter((friend) => !memberIds.has(friend.id))
      .sort((a, b) => a.display_name.localeCompare(b.display_name, 'sv'));
  }, [conversation, friendships, userId]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter(
      (friend) =>
        friend.display_name.toLowerCase().includes(needle) ||
        friend.username.toLowerCase().includes(needle),
    );
  }, [candidates, query]);

  function toggle(friend: FriendProfile) {
    setSelected((current) =>
      current.some((person) => person.id === friend.id)
        ? current.filter((person) => person.id !== friend.id)
        : [...current, friend],
    );
  }

  const mutation = useMutation({
    mutationFn: () =>
      addConversationMembers(
        id!,
        selected.map((person) => person.id),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversation(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
      showToast({ tone: 'success', message: addedToast(selected) });
      router.back();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const count = selected.length;

  return (
    <FormScreen
      footer={
        <>
          {error ? <ThemedText type="error">{error}</ThemedText> : null}
          <Button
            label={
              count === 0
                ? 'Lägg till'
                : `Lägg till ${count} ${count === 1 ? 'kompis' : Words.friends.toLowerCase()}`
            }
            onPress={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={count === 0 || !id}
          />
        </>
      }
    >
      <ThemedText type="small" themeColor="textSecondary">
        De nya ser meddelanden från och med nu, inte det ni skrev innan.
      </ThemedText>
      {candidates.length > 5 ? (
        <TextField
          label="Sök"
          placeholder="Sök bland dina kompisar"
          autoCapitalize="none"
          value={query}
          onChangeText={setQuery}
        />
      ) : null}
      {isLoading || !conversation ? (
        <SkeletonList style={styles.skeleton} />
      ) : isError ? (
        <ErrorState
          message="Kompisarna gick inte att ladda. Kolla nätet och testa igen."
          onRetry={refetch}
        />
      ) : candidates.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Alla är redan med"
          message="Alla dina kompisar är redan med i gruppen. Lägg till fler kompisar först."
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
          {results.map((friend) => {
            const isSelected = selected.some((person) => person.id === friend.id);
            return (
              <ListRow
                key={friend.id}
                title={friend.display_name}
                subtitle={`@${friend.username}`}
                leading={
                  <Avatar name={friend.display_name} imageUrl={friend.avatar_url} size={44} />
                }
                trailing={
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={isSelected ? theme.brand : theme.border}
                  />
                }
                accessibilityLabel={`${isSelected ? 'Avmarkera' : 'Välj'} ${friend.display_name}`}
                onPress={() => toggle(friend)}
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
  results: { marginHorizontal: -Spacing.three },
});
