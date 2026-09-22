import { useRef, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import {
  conversationTitle,
  fetchConversation,
  fetchMessages,
  sendMessage,
  type Message,
} from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  return (
    <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
      {!isMine ? (
        <Avatar name={message.sender?.display_name ?? '?'} imageUrl={message.sender?.avatar_url} size={28} />
      ) : null}
      <ThemedView type={isMine ? 'backgroundSelected' : 'backgroundElement'} style={styles.bubble}>
        {!isMine ? (
          <ThemedText type="small" themeColor="textSecondary">
            {message.sender?.display_name ?? 'Okänd användare'}
          </ThemedText>
        ) : null}
        <ThemedText>{message.body}</ThemedText>
      </ThemedView>
    </View>
  );
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<Message>>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const { data: conversation } = useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: () => fetchConversation(id!),
    enabled: !!id,
  });

  const { data: messages } = useQuery({
    queryKey: queryKeys.messages(id),
    queryFn: () => fetchMessages(id!),
    enabled: !!id,
  });

  useRealtimeTable({
    channelName: `messages:${id}`,
    table: 'messages',
    event: 'INSERT',
    filter: `conversation_id=eq.${id}`,
    enabled: !!id,
    onChange: () => queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) }),
  });

  async function handleSend() {
    if (!userId || !id || !body.trim()) return;
    setSending(true);
    try {
      await sendMessage({ conversationId: id, senderId: userId, body: body.trim() });
      setBody('');
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
    } finally {
      setSending(false);
    }
  }

  const title = conversation && userId ? conversationTitle(conversation, userId) : 'Chatt';

  return (
    <ScreenBackground style={styles.container}>
      <Stack.Screen options={{ title }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          ref={listRef}
          data={messages ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isMine={item.sender_id === userId} />
          )}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inputRow}
        >
          <TextField
            placeholder="Skriv ett meddelande..."
            value={body}
            onChangeText={setBody}
            style={styles.input}
          />
          <Button
            label="Skicka"
            icon="send"
            onPress={handleSend}
            loading={sending}
            disabled={!body.trim()}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  list: { gap: Spacing.two, paddingVertical: Spacing.three },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
    maxWidth: '72%',
  },
  inputRow: { flexDirection: 'row', gap: Spacing.two, paddingBottom: Spacing.three },
  input: { flex: 1 },
});
