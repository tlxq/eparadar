import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { IconButton } from '@/components/icon-button';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { useTheme } from '@/hooks/use-theme';
import {
  conversationAvatarUrl,
  conversationTitle,
  fetchConversation,
  fetchMessages,
  sendMessage,
  type Message,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { formatDayDivider } from '@/lib/relative-time';
import { showToast } from '@/store/toast';
import { useAuthStore } from '@/store/auth';

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const DIVIDER_GAP_MS = 30 * 60 * 1000;
const AVATAR_SIZE = 28;
const TIGHT = 6;
const ROUND = Radius.xl;

function gapMs(a: Message, b: Message) {
  return Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function continues(a: Message | undefined, b: Message | undefined) {
  return !!a && !!b && a.sender_id === b.sender_id && gapMs(a, b) < GROUP_WINDOW_MS;
}

type BubbleProps = {
  message: Message;
  previous?: Message;
  next?: Message;
  isMine: boolean;
  showNames: boolean;
};

function MessageBubble({ message, previous, next, isMine, showNames }: BubbleProps) {
  const theme = useTheme();
  const showDivider = !previous || gapMs(previous, message) >= DIVIDER_GAP_MS;
  const joinsPrevious = !showDivider && continues(previous, message);
  const joinsNext = continues(message, next) && gapMs(message, next!) < DIVIDER_GAP_MS;
  const senderName = message.sender?.display_name ?? 'Okänd användare';

  const corners = isMine
    ? {
        borderTopRightRadius: joinsPrevious ? TIGHT : ROUND,
        borderBottomRightRadius: joinsNext ? TIGHT : ROUND,
      }
    : {
        borderTopLeftRadius: joinsPrevious ? TIGHT : ROUND,
        borderBottomLeftRadius: joinsNext ? TIGHT : ROUND,
      };

  return (
    <View style={!joinsPrevious && styles.groupStart}>
      {showDivider ? (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.divider}>
          {formatDayDivider(message.created_at)}
        </ThemedText>
      ) : null}
      {!isMine && showNames && !joinsPrevious ? (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.senderName}>
          {senderName}
        </ThemedText>
      ) : null}
      <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
        {!isMine ? (
          joinsNext ? (
            <View style={styles.avatarSpacer} />
          ) : (
            <Avatar name={senderName} imageUrl={message.sender?.avatar_url} size={AVATAR_SIZE} />
          )
        ) : null}
        <View
          style={[
            styles.bubble,
            corners,
            { backgroundColor: isMine ? theme.brand : theme.backgroundElement },
          ]}
        >
          <ThemedText style={isMine ? { color: theme.brandText } : undefined}>
            {message.body}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

export default function ConversationScreen() {
  const theme = useTheme();
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
    const text = body.trim();
    if (!userId || !id || !text) return;
    setSending(true);
    try {
      await sendMessage({ conversationId: id, senderId: userId, body: text });
      setBody('');
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
    } catch (error) {
      showToast({
        tone: 'error',
        message: `Meddelandet skickades inte. ${getErrorMessage(error)}`,
      });
    } finally {
      setSending(false);
    }
  }

  const title = conversation && userId ? conversationTitle(conversation, userId) : 'Chatt';
  const avatarUrl = conversation && userId ? conversationAvatarUrl(conversation, userId) : null;
  const isGroup = !!conversation?.is_group;
  const memberCount = conversation?.conversation_members.length ?? 0;
  const list = messages ?? [];
  const canSend = !!body.trim() && !sending;

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={[styles.nav, { borderBottomColor: theme.separator }]}>
          <IconButton
            icon="chevron-back"
            variant="plain"
            accessibilityLabel="Tillbaka"
            onPress={() => router.back()}
          />
          <Avatar name={title} imageUrl={avatarUrl} size={36} />
          <View style={styles.navText}>
            <ThemedText type="headline" numberOfLines={1} accessibilityRole="header">
              {title}
            </ThemedText>
            {isGroup ? (
              <ThemedText type="caption" themeColor="textSecondary">
                {memberCount} medlemmar
              </ThemedText>
            ) : null}
          </View>
        </View>
        <KeyboardAvoider style={styles.container}>
          <FlatList
            ref={listRef}
            data={list}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                previous={list[index - 1]}
                next={list[index + 1]}
                isMine={item.sender_id === userId}
                showNames={isGroup}
              />
            )}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              messages ? (
                <View style={styles.emptyThread}>
                  <Avatar name={title} imageUrl={avatarUrl} size={72} />
                  <ThemedText type="headline">{title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Inga meddelanden än. Säg hej!
                  </ThemedText>
                </View>
              ) : null
            }
          />
          <View style={styles.composer}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Skriv ett meddelande…"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Meddelande"
              multiline
              style={[
                styles.input,
                { backgroundColor: theme.backgroundElement, color: theme.text },
              ]}
            />
            <IconButton
              icon="arrow-up"
              variant="brand"
              size={44}
              accessibilityLabel="Skicka"
              onPress={handleSend}
              disabled={!canSend}
            />
          </View>
        </KeyboardAvoider>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navText: { flex: 1 },
  list: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: 2, flexGrow: 1 },
  groupStart: { marginTop: Spacing.two },
  divider: { alignSelf: 'center', paddingVertical: Spacing.two },
  senderName: { marginLeft: AVATAR_SIZE + Spacing.two + Spacing.two, marginBottom: Spacing.half },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  bubbleRowMine: { justifyContent: 'flex-end' },
  avatarSpacer: { width: AVATAR_SIZE },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: ROUND,
  },
  emptyThread: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
    fontFamily: Fonts.inter.regular,
  },
});
