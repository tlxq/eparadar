import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { searchUsersToAdd, sendFriendRequest, type Profile } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function AddFriendScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(text: string) {
    setQuery(text);
    if (!userId || text.trim().length < 2) {
      setResults([]);
      return;
    }
    const users = await searchUsersToAdd(text, userId);
    setResults(users);
  }

  const mutation = useMutation({
    mutationFn: (targetUserId: string) => sendFriendRequest(targetUserId),
    onSuccess: (_data, targetUserId) => {
      setSentIds((current) => new Set(current).add(targetUserId));
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Något gick fel.'),
  });

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TextField placeholder="Sök användarnamn" value={query} onChangeText={handleSearch} />
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const sent = sentIds.has(item.id);
            return (
              <Pressable onPress={() => !sent && mutation.mutate(item.id)} disabled={sent}>
                <ThemedView type="backgroundElement" style={styles.userRow}>
                  <Avatar name={item.display_name} size={32} />
                  <View style={styles.userRowText}>
                    <ThemedText type="smallBold">{item.display_name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      @{item.username}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor={sent ? 'success' : 'brandOnSurface'}>
                    {sent ? 'Skickad' : 'Lägg till'}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.list}
        />
        {error ? <ThemedText type="error">{error}</ThemedText> : null}
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
  userRowText: { flex: 1, gap: Spacing.half },
});
