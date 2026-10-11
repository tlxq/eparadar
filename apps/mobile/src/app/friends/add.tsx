import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { CandidateRow } from '@/features/friends/components/candidate-row';
import { CodeEntry } from '@/features/friends/components/code-entry';
import { RadarHero } from '@/features/friends/components/radar-hero';
import { SuggestionSection } from '@/features/friends/components/suggestion-section';
import { formatRelativeSwedish } from '@/features/friends/api';
import { useMeetupSuggestions, useMutualSuggestions } from '@/features/friends/hooks';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { sendFriendRequest } from '@/lib/api';
import { useUserId } from '@/hooks/use-user-id';

export default function AddFriendScreen() {
  const theme = useTheme();
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
      setSentIds((current) => new Set(current).add(targetUserId));
      setError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.meetupSuggestions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mutualSuggestions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingRequests(userId) });
    },
    onError: (err) => setError(getErrorMessage(err)),
    onSettled: () => setSendingId(null),
  });

  const blipCount = Math.min(
    4,
    (meetupSuggestions.data?.length ?? 0) + (mutualSuggestions.data?.length ?? 0),
  );

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

          <CodeEntry />

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

          <View style={styles.nearbySection}>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
              I NÄRHETEN NU
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/friends/nearby')}
              style={({ pressed }) => [
                styles.nearbyCard,
                { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
              ]}
            >
              <View style={[styles.nearbyIcon, { backgroundColor: theme.brand }]}>
                <Ionicons name="radio-outline" size={22} color={theme.brandText} />
              </View>
              <View style={styles.nearbyText}>
                <ThemedText type="headline">Starta radarn</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Hitta folk inom 100 m som också har radarn öppen.
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

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
            <Button
              label="Skanna kod"
              icon="scan-outline"
              onPress={() => router.push('/friends/scan')}
            />
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
  nearbySection: { gap: Spacing.two },
  sectionLabel: { letterSpacing: 0.6 },
  nearbyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  nearbyIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyText: { flex: 1, gap: Spacing.half },
});
