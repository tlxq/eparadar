import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { FormScreen } from '@/components/form-screen';
import { ListRow } from '@/components/list-row';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserSearch } from '@/hooks/use-user-search';
import { createConversation, searchUsers, type Profile } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

export default function NewChatScreen() {
  const theme = useTheme();
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();
  const { query, results, handleSearch } = useUserSearch(searchUsers, userId);
  const [selected, setSelected] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggleSelected(user: Profile) {
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
      <TextField
        label="Till"
        placeholder="Sök på namn eller användarnamn"
        autoCapitalize="none"
        autoFocus
        value={query}
        onChangeText={handleSearch}
      />
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
      {query.trim().length < 2 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Skriv minst två tecken för att söka.
        </ThemedText>
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
