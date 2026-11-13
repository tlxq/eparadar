import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModalHeader } from '@/components/modal-header';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { CandidateRow } from '@/features/friends/components/candidate-row';
import { AddTiles } from '@/features/friends/components/add-tiles';
import { SuggestionSection } from '@/features/friends/components/suggestion-section';
import { formatRelativeSwedish } from '@/features/friends/api';
import {
  useMeetupSuggestions,
  useMutualSuggestions,
  useSendFriendRequest,
} from '@/features/friends/hooks';
import { Words } from '@/constants/strings';
import { Spacing } from '@/constants/theme';

export default function AddFriendScreen() {
  const meetupSuggestions = useMeetupSuggestions();
  const mutualSuggestions = useMutualSuggestions();

  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const send = useSendFriendRequest();
  const sendingId = send.isPending ? send.variables.userId : null;

  function add(candidate: { user_id: string; display_name: string }) {
    send.mutate(
      { userId: candidate.user_id, name: candidate.display_name },
      { onSuccess: () => setSentIds((current) => new Set(current).add(candidate.user_id)) },
    );
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ModalHeader title={Words.addFriend} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.intro}>
            <AddTiles />
            <ThemedText type="small" themeColor="textSecondary" style={styles.introCopy}>
              Lägg bara till folk du faktiskt träffat.
            </ThemedText>
          </View>

          <SuggestionSection
            title="Möttes på en träff"
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
                onAdd={() => add(candidate)}
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
                onAdd={() => add(candidate)}
                sending={sendingId === candidate.user_id}
                sent={sentIds.has(candidate.user_id)}
              />
            ))}
          </SuggestionSection>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.five,
  },
  intro: { gap: Spacing.three },
  introCopy: { textAlign: 'center' },
});
