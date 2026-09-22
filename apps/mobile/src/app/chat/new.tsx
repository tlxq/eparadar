import { useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserSearchRow } from '@/components/user-search-row';
import { Spacing } from '@/constants/theme';
import { useUserSearch } from '@/hooks/use-user-search';
import { createConversation, searchUsers, type Profile } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

export default function NewChatScreen() {
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
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TextField placeholder="Sök användarnamn" value={query} onChangeText={handleSearch} />
        {selected.length > 1 ? (
          <TextField
            placeholder="Gruppnamn (valfritt)"
            value={groupName}
            onChangeText={setGroupName}
          />
        ) : null}
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selected.some((u) => u.id === item.id);
            return (
              <Pressable onPress={() => toggleSelected(item)}>
                <ThemedView
                  type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.userRow}
                >
                  <UserSearchRow user={item} />
                </ThemedView>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.list}
        />
        {error ? <ThemedText type="error">{error}</ThemedText> : null}
        <Button
          label="Starta chatt"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={selected.length === 0}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  list: { gap: Spacing.two },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
