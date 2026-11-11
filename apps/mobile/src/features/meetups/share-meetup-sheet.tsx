import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { ConversationAvatar } from '@/components/conversation-avatar';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormSheet } from '@/components/form-sheet';
import { ListRow } from '@/components/list-row';
import { SkeletonList } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useConversations } from '@/features/chat/hooks';
import type { Meetup } from '@/features/meetups/api';
import { formatMeetupTime } from '@/features/meetups/time';
import { useUserId } from '@/hooks/use-user-id';
import { conversationTitle, sendMessage, type Conversation } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { successHaptic } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

function meetupShareText(meetup: Pick<Meetup, 'title' | 'starts_at'>): string {
  return `Häng med på ${meetup.title}! ${formatMeetupTime(meetup.starts_at)}.`;
}

type ShareMeetupSheetProps = {
  meetup: Pick<Meetup, 'id' | 'title' | 'starts_at'>;
  onClose: () => void;
};

export function ShareMeetupSheet({ meetup, onClose }: ShareMeetupSheetProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const { data: conversations, isLoading, isError, refetch } = useConversations();
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  async function share(conversation: Conversation) {
    if (!userId || sendingTo) return;
    setSendingTo(conversation.id);
    try {
      await sendMessage({
        conversationId: conversation.id,
        senderId: userId,
        body: meetupShareText(meetup),
        meetupId: meetup.id,
      });
      successHaptic();
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversation.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
      showToast({
        tone: 'success',
        message: `Träffen är skickad till ${conversationTitle(conversation, userId)}!`,
      });
      onClose();
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <FormSheet title="Dela till en chatt" onClose={onClose} gap="two">
      <ThemedText type="small" themeColor="textSecondary">
        Bara kompisar till den som skapade träffen kan öppna den.
      </ThemedText>
      {isLoading ? (
        <SkeletonList rows={4} />
      ) : isError ? (
        <ErrorState
          message="Chattarna gick inte att ladda. Kolla nätet och testa igen."
          onRetry={refetch}
        />
      ) : !conversations?.length || !userId ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="Inga chattar än"
          message="Starta en chatt med en kompis först, sen kan du dela träffen."
        />
      ) : (
        <View style={styles.list}>
          {conversations.map((conversation) => (
            <ListRow
              key={conversation.id}
              title={conversationTitle(conversation, userId)}
              subtitle={sendingTo === conversation.id ? 'Skickar …' : null}
              leading={
                <ConversationAvatar conversation={conversation} myUserId={userId} size={44} />
              }
              accessibilityLabel={`Skicka träffen till ${conversationTitle(conversation, userId)}`}
              onPress={() => share(conversation)}
            />
          ))}
        </View>
      )}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.one },
});
