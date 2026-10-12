import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { CandidateRow } from '@/features/friends/components/candidate-row';
import { AddTiles } from '@/features/friends/components/add-tiles';
import { SuggestionSection } from '@/features/friends/components/suggestion-section';
import { formatRelativeSwedish } from '@/features/friends/api';
import { useMeetupSuggestions, useMutualSuggestions } from '@/features/friends/hooks';
import { Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { maybeRequestNotificationPermission } from '@/lib/push-notifications';
import { queryKeys } from '@/lib/query-keys';
import { sendFriendRequest } from '@/lib/api';
import { useUserId } from '@/hooks/use-user-id';
import { successHaptic } from '@/lib/haptics';

export default function AddFriendScreen() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  const meetupSuggestions = useMeetupSuggestions();
  const mutualSuggestions = useMutualSuggestions();

  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (targetUserId: string) => sendFriendRequest(targetUserId),
    onMutate: (targetUserId) => setSendingId(targetUserId),
    onSuccess: (_data, targetUserId) => {
      successHaptic();
      setSentIds((current) => new Set(current).add(targetUserId));
      setError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.meetupSuggestions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mutualSuggestions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingRequests(userId) });
      if (userId) maybeRequestNotificationPermission(userId, 'friend_request');
    },
    onError: (err) => setError(getErrorMessage(err)),
    onSettled: () => setSendingId(null),
  });

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.intro}>
            <AddTiles />
            <ThemedText type="small" themeColor="textSecondary" style={styles.introCopy}>
              Lägg bara till folk du faktiskt träffat.
            </ThemedText>
          </View>

          <SuggestionSection
            title="Möttes på en meet"
            isLoading={meetupSuggestions.isLoading}
            isEmpty={!meetupSuggestions.data?.length}
            emptyText="Inga meets än. Gå på en meet eller skanna någons kod för att lägga till dem."
          >
            {meetupSuggestions.data?.map((candidate) => (
              <CandidateRow
                key={candidate.user_id}
                displayName={candidate.display_name}
                avatarUrl={candidate.avatar_url}
                buttonVariant="primary"
                topLine={`Ni sågs på ${candidate.last_meetup_title}`}
                subLine={formatRelativeSwedish(candidate.last_checked_in_at)}
                onAdd={() => mutation.mutate(candidate.user_id)}
                sending={sendingId === candidate.user_id}
                sent={sentIds.has(candidate.user_id)}
              />
            ))}
          </SuggestionSection>

          <SuggestionSection
            title="Gemensamma kompisar"
            isLoading={mutualSuggestions.isLoading}
            isEmpty={!mutualSuggestions.data?.length}
            emptyText="Inga gemensamma kompisar att visa än."
          >
            {mutualSuggestions.data?.map((candidate) => (
              <CandidateRow
                key={candidate.user_id}
                displayName={candidate.display_name}
                avatarUrl={candidate.avatar_url}
                subLine={`${candidate.mutual_friend_count} ${candidate.mutual_friend_count === 1 ? 'gemensam kompis' : 'gemensamma kompisar'}`}
                onAdd={() => mutation.mutate(candidate.user_id)}
                sending={sendingId === candidate.user_id}
                sent={sentIds.has(candidate.user_id)}
              />
            ))}
          </SuggestionSection>

          {error ? (
            <ThemedText type="error" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.five,
  },
  intro: { gap: Spacing.three },
  introCopy: { textAlign: 'center' },
  error: { textAlign: 'center' },
});
