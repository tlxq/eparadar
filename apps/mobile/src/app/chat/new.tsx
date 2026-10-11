import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { FormScreen } from '@/components/form-screen';
import { ListRow } from '@/components/list-row';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createConversation, fetchFriends, friendProfile } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

type FriendProfile = ReturnType<typeof friendProfile>;

export default function NewChatScreen() {
  const theme = useTheme();
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FriendProfile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: friendships, isLoading } = useQuery({
    queryKey: queryKeys.friends(userId),
    queryFn: () => fetchFriends(userId!),
    enabled: !!userId,
  });

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
        groupName: selected.length > 1 ? groupName || null : null,
      }),
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
      router.replace(`/chat/${conversationId}`);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <FormScreen
      footer={
        <>
          {error ? <ThemedText type="error">{error}</ThemedText> : null}
          <Button
            label={selected.length > 1 ? `Starta grupp (${selected.length + 1})` : 'Starta chatt'}
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
          placeholder="Sök bland dina vänner"
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
        />
      ) : null}
      {isLoading ? null : friends.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Inga vänner än"
          message="Du kan chatta med dina vänner. Lägg till någon du har träffat först."
          action={{
            label: 'Lägg till vän',
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
