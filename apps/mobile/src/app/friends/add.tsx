import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { CandidateRow } from '@/features/friends/components/candidate-row';
import { RadarHero } from '@/features/friends/components/radar-hero';
import { SuggestionSection } from '@/features/friends/components/suggestion-section';
import { formatRelativeSwedish } from '@/features/friends/api';
import { useMeetupSuggestions, useMutualSuggestions } from '@/features/friends/hooks';
import { Spacing } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { sendFriendRequest } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function AddFriendScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  const meetupSuggestions = useMeetupSuggestions(userId);
  const mutualSuggestions = useMutualSuggestions(userId);

  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (targetUserId: string) => sendFriendRequest(targetUserId),
    onMutate: (targetUserId) => setSendingId(targetUserId),
    onSuccess: (_data, targetUserId) => {
      setSentIds((current) => new Set(current).add(targetUserId));
      setError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.meetupSuggestions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mutualSuggestions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingRequests(userId) });
    },
    onError: (err) => setError(getErrorMessage(err)),
    onSettled: () => setSendingId(null),
  });

  const blipCount = Math.min(4, (meetupSuggestions.data?.length ?? 0) + (mutualSuggestions.data?.length ?? 0));

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <RadarHero blipCount={blipCount} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.heroCopy}>
              Vi vill att du bara lägger till folk du faktiskt träffat.
            </ThemedText>
          </View>

          <SuggestionSection
            title="Möttes vid en träff"
            isLoading={meetupSuggestions.isLoading}
            isEmpty={!meetupSuggestions.data?.length}
            emptyText="Inga träffar än. Gå på en träff eller skanna någons kod för att lägga till dem."
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
            title="Gemensamma vänner"
            isLoading={mutualSuggestions.isLoading}
            isEmpty={!mutualSuggestions.data?.length}
            emptyText="Inga gemensamma vänner att visa än."
          >
            {mutualSuggestions.data?.map((candidate) => (
              <CandidateRow
                key={candidate.user_id}
                displayName={candidate.display_name}
                avatarUrl={candidate.avatar_url}
                subLine={`${candidate.mutual_friend_count} ${candidate.mutual_friend_count === 1 ? 'gemensam vän' : 'gemensamma vänner'}`}
                onAdd={() => mutation.mutate(candidate.user_id)}
                sending={sendingId === candidate.user_id}
                sent={sentIds.has(candidate.user_id)}
              />
            ))}
          </SuggestionSection>

          <SuggestionSection
            title="I närheten nu"
            isLoading={false}
            isEmpty
            emptyText="Kommer snart."
          >
            <View />
          </SuggestionSection>

          {error ? (
            <ThemedText type="error" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View style={styles.actionBar}>
          <View style={styles.actionButton}>
            <Button
              label="Visa min kod"
              icon="qr-code-outline"
              variant="secondary"
              onPress={() => router.push('/friends/code')}
            />
          </View>
          <View style={styles.actionButton}>
            <Button label="Skanna kod" icon="scan-outline" onPress={() => router.push('/friends/scan')} />
          </View>
        </View>
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
  hero: { alignItems: 'center', gap: Spacing.two },
  heroCopy: { textAlign: 'center', maxWidth: 280 },
  error: { textAlign: 'center' },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  actionButton: { flex: 1 },
});
