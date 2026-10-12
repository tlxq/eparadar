import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { ActionSheet } from '@/components/action-sheet';
import { ConversationAvatar } from '@/components/conversation-avatar';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useConversations } from '@/features/chat/hooks';
import { sharePostToChat } from '@/features/feed/api';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/hooks/use-user-id';
import { conversationTitle } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { successHaptic } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-keys';
import { useSharePostStore } from '@/store/share-post';
import { showToast } from '@/store/toast';

export function ShareSheetHost() {
  const postId = useSharePostStore((state) => state.postId);
  const onClose = useSharePostStore((state) => state.close);
  const theme = useTheme();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const { data: conversations, isLoading } = useConversations();
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  async function send(conversationId: string, title: string) {
    if (!postId || !userId || sendingTo) return;
    setSendingTo(conversationId);
    try {
      await sharePostToChat({ conversationId, senderId: userId, postId });
      successHaptic();
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
      onClose();
      showToast({
        tone: 'success',
        message: `Skickad till ${title}!`,
        action: { label: 'Öppna', onPress: () => router.push(`/chat/${conversationId}`) },
      });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <ActionSheet
      visible={!!postId}
      title="Skicka i chatt"
      onClose={onClose}
      actions={[]}
      header={
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {isLoading ? (
            [0, 1, 2].map((key) => (
              <View key={key} style={styles.row}>
                <Skeleton width={40} height={40} radius={20} />
                <Skeleton width="50%" />
              </View>
            ))
          ) : (conversations ?? []).length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Du har inga chattar än. Starta en från Chatt-fliken.
            </ThemedText>
          ) : (
            (conversations ?? []).map((conversation) => {
              const title = conversationTitle(conversation, userId!);
              return (
                <Pressable
                  key={conversation.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Skicka till ${title}`}
                  disabled={!!sendingTo}
                  onPress={() => send(conversation.id, title)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  <ConversationAvatar conversation={conversation} myUserId={userId!} size={40} />
                  <ThemedText type="headline" numberOfLines={1} style={styles.title}>
                    {title}
                  </ThemedText>
                  {sendingTo === conversation.id ? (
                    <ActivityIndicator color={theme.textSecondary} />
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 380 },
  listContent: { gap: Spacing.one, paddingBottom: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
  },
  title: { flex: 1 },
  empty: { textAlign: 'center', paddingVertical: Spacing.three },
});
