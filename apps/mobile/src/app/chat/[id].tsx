import { useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { FlatList, Image, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { ConversationAvatar } from '@/components/conversation-avatar';
import { IconButton } from '@/components/icon-button';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { useTheme } from '@/hooks/use-theme';
import {
  conversationTitle,
  fetchMessages,
  markConversationRead,
  sendMessage,
  toggleReaction,
  unsendMessage,
  type Message,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { uploadChatImage } from '@/lib/image-upload';
import { readersOf } from '@/lib/chat-state';
import { queryKeys } from '@/lib/query-keys';
import { sendStoppedTyping, sendTyping } from '@/lib/typing';
import { openPerson } from '@/store/person-sheet';
import { pressHaptic, tapHaptic } from '@/lib/haptics';
import { randomId } from '@/lib/random-id';
import { showToast } from '@/store/toast';
import { activeTypists, TYPING_TTL_MS, typingLabel, useTypingStore } from '@/store/typing';
import { useProfile } from '@/features/profile/hooks';
import { useConversation } from '@/features/chat/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { pickImage, type ImageSource } from '@/lib/pick-image';
import {
  MessageBubble,
  REACTIONS,
  ReadReceipt,
  TypingBubble,
} from '@/features/chat/components/message-bubble';
import { Common } from '@/constants/strings';
import { openReport } from '@/store/report-sheet';
export default function ConversationScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<Message>>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState<Message | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { data: myProfile } = useProfile();
  const myName = myProfile?.display_name ?? '';

  const typists = useTypingStore((state) => (id ? state.byConversation[id] : undefined));
  const someoneTyping = Object.keys(typists ?? {}).length > 0;

  useEffect(() => {
    if (!someoneTyping) return;
    const timer = setInterval(() => setNow(Date.now()), TYPING_TTL_MS / 4);
    return () => clearInterval(timer);
  }, [someoneTyping]);

  const { data: conversation, isError: conversationError } = useConversation(id);

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

  useRealtimeTable({
    channelName: `messages-deleted:${id}`,
    table: 'messages',
    event: 'DELETE',
    enabled: !!id,
    onChange: (payload) => {
      const deletedId = (payload.old as { id?: string }).id;
      const cached = queryClient.getQueryData<Message[]>(queryKeys.messages(id));
      if (deletedId && cached?.some((message) => message.id === deletedId)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
      }
    },
  });

  useRealtimeTable({
    channelName: `reactions:${id}`,
    table: 'message_reactions',
    event: '*',
    enabled: !!id,
    onChange: (payload) => {
      const row = (payload.new ?? payload.old) as { message_id?: string };
      const cached = queryClient.getQueryData<Message[]>(queryKeys.messages(id));
      if (!row?.message_id || cached?.some((message) => message.id === row.message_id)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
      }
    },
  });

  useRealtimeTable({
    channelName: `members:${id}`,
    table: 'conversation_members',
    event: 'UPDATE',
    filter: `conversation_id=eq.${id}`,
    enabled: !!id,
    onChange: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversation(id) }),
  });

  const lastMessageId = messages?.[messages.length - 1]?.id;

  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused || !id || !userId || !lastMessageId) return;
    markConversationRead(id)
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) }))
      .catch(() => undefined);
  }, [isFocused, id, userId, lastMessageId, queryClient]);

  async function handleCopy(message: Message) {
    await Clipboard.setStringAsync(message.body);
    showToast({ tone: 'success', message: 'Kopierat.' });
  }

  async function handleUnsend(message: Message) {
    try {
      await unsendMessage(message.id, message.image_path);
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversation(id) });
    }
  }

  function handleChangeText(text: string) {
    setBody(text);
    if (id && userId && text.trim()) sendTyping(id, userId, myName);
  }

  async function handleReact(message: Message, emoji: string) {
    setSelected(null);
    tapHaptic();
    try {
      await toggleReaction(message.id, emoji);
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  async function handlePickImage(source: ImageSource) {
    if (!id || !userId) return;
    const uri = await pickImage({ quality: 0.7, source });
    if (!uri) return;
    setSending(true);
    try {
      const imagePath = await uploadChatImage(id, uri);
      await sendMessage({ conversationId: id, senderId: userId, body: body.trim(), imagePath });
      setBody('');
      sendStoppedTyping(id, userId, myName);
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
    } catch (error) {
      showToast({ tone: 'error', message: `Bilden skickades inte. ${getErrorMessage(error)}` });
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    const text = body.trim();
    if (!userId || !id || !text) return;
    const key = queryKeys.messages(id);
    const draft: Message = {
      id: randomId(),
      conversation_id: id,
      sender_id: userId,
      body: text,
      image_path: null,
      created_at: new Date().toISOString(),
      sender: myProfile
        ? {
            id: userId,
            username: myProfile.username,
            display_name: myProfile.display_name,
            avatar_url: myProfile.avatar_url,
          }
        : null,
      reactions: [],
      pending: true,
    };
    setBody('');
    tapHaptic();
    sendStoppedTyping(id, userId, myName);
    await queryClient.cancelQueries({ queryKey: key });
    queryClient.setQueryData<Message[]>(key, (current) => [...(current ?? []), draft]);
    try {
      await sendMessage({ id: draft.id, conversationId: id, senderId: userId, body: text });
      queryClient.setQueryData<Message[]>(key, (current) =>
        current?.map((message) =>
          message.id === draft.id ? { ...message, pending: false } : message,
        ),
      );
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
    } catch (error) {
      queryClient.setQueryData<Message[]>(key, (current) =>
        current?.filter((message) => message.id !== draft.id),
      );
      setBody((current) => current || text);
      showToast({
        tone: 'error',
        message: `Meddelandet skickades inte. ${getErrorMessage(error)}`,
      });
    }
  }

  const selectedIsMine = !!selected && selected.sender_id === userId;
  const selectedIsRead =
    !!selected &&
    !!conversation &&
    !!userId &&
    readersOf(conversation, selected, userId).length > 0;
  const selectedActions: SheetAction[] = selected
    ? [
        ...(selected.body.trim()
          ? [
              {
                label: 'Kopiera',
                icon: 'copy-outline' as const,
                onPress: () => handleCopy(selected),
              },
            ]
          : []),
        ...(selectedIsMine
          ? [
              {
                label: Common.remove,
                icon: 'trash-outline' as const,
                destructive: true,
                disabled: selectedIsRead,
                hint: selectedIsRead ? 'Redan läst, kan inte tas bort' : undefined,
                onPress: () => handleUnsend(selected),
              },
            ]
          : [
              {
                label: Common.report,
                icon: 'flag-outline' as const,
                onPress: () =>
                  openReport({
                    type: 'message',
                    id: selected.id,
                    userId: selected.sender_id,
                    name: selected.sender?.display_name ?? 'personen',
                  }),
              },
            ]),
      ]
    : [];

  const title = conversation && userId ? conversationTitle(conversation, userId) : 'Chatt';
  const isGroup = !!conversation?.is_group;
  const memberCount = conversation?.conversation_members.length ?? 0;
  const otherMemberId = conversation?.conversation_members.find(
    (member) => member.user_id !== userId,
  )?.user_id;
  const list = messages ?? [];
  const canSend = !!body.trim() && !sending;
  const typing = typingLabel(activeTypists(typists, userId, now), isGroup);
  const myReaction = selected?.reactions?.find((reaction) => reaction.user_id === userId)?.emoji;

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={[styles.nav, { borderBottomColor: theme.separator }]}>
          <IconButton
            icon="chevron-back"
            variant="plain"
            accessibilityLabel={Common.back}
            onPress={() => router.back()}
          />
          <Pressable
            disabled={!isGroup && !otherMemberId}
            accessibilityRole="button"
            accessibilityHint={isGroup ? 'Öppnar gruppinfo' : 'Visar profilen'}
            onPress={() =>
              isGroup ? router.push(`/group/${id}`) : otherMemberId && openPerson(otherMemberId)
            }
            style={({ pressed }) => [styles.navTitle, pressed && styles.bubblePressed]}
          >
            {conversation && userId ? (
              <ConversationAvatar conversation={conversation} myUserId={userId} size={36} />
            ) : (
              <Avatar name={title} size={36} />
            )}
            <View style={styles.navText}>
              <ThemedText type="headline" numberOfLines={1} accessibilityRole="header">
                {title}
              </ThemedText>
              {isGroup ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {memberCount} medlemmar · tryck för info
                </ThemedText>
              ) : null}
            </View>
          </Pressable>
        </View>
        {conversationError ? (
          <ThemedText themeColor="textSecondary" style={styles.goneNotice}>
            Du är inte längre med i den här chatten.
          </ThemedText>
        ) : null}
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
                myUserId={userId}
                onLongPress={(message) => {
                  if (message.pending) return;
                  pressHaptic();
                  setSelected(message);
                }}
                onOpenImage={setViewerUrl}
              />
            )}
            ListFooterComponent={
              <>
                {conversation && userId && list.length > 0 ? (
                  <ReadReceipt
                    conversation={conversation}
                    message={list[list.length - 1]}
                    myUserId={userId}
                  />
                ) : null}
                {typing ? <TypingBubble label={typing} /> : null}
              </>
            }
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              messages ? (
                <View style={styles.emptyThread}>
                  {conversation && userId ? (
                    <ConversationAvatar conversation={conversation} myUserId={userId} size={72} />
                  ) : null}
                  <ThemedText type="headline">{title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Inga meddelanden än. Säg hej!
                  </ThemedText>
                </View>
              ) : null
            }
          />
          <View style={styles.composer}>
            <IconButton
              icon="camera-outline"
              size={44}
              accessibilityLabel="Ta en bild"
              onPress={() => handlePickImage('camera')}
              disabled={sending}
            />
            <IconButton
              icon="image-outline"
              size={44}
              accessibilityLabel="Skicka en bild"
              onPress={() => handlePickImage('library')}
              disabled={sending}
            />
            <TextInput
              value={body}
              onChangeText={handleChangeText}
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
        <ActionSheet
          visible={!!selected}
          title={selected ? selected.body.slice(0, 80) || 'Bild' : undefined}
          onClose={() => setSelected(null)}
          actions={selectedActions}
          header={
            selected ? (
              <View style={styles.reactionBar} accessibilityRole="toolbar">
                {REACTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    accessibilityRole="button"
                    accessibilityLabel={`Reagera med ${emoji}`}
                    accessibilityState={{ selected: myReaction === emoji }}
                    onPress={() => handleReact(selected, emoji)}
                    style={({ pressed }) => [
                      styles.reactionButton,
                      myReaction === emoji && { backgroundColor: theme.backgroundSelected },
                      pressed && styles.bubblePressed,
                    ]}
                  >
                    <ThemedText style={styles.reactionEmoji}>{emoji}</ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
        />
        <Modal
          visible={!!viewerUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerUrl(null)}
        >
          <View style={styles.viewer}>
            {viewerUrl ? (
              <Image
                source={{ uri: viewerUrl }}
                style={styles.viewerImage}
                resizeMode="contain"
                accessibilityLabel="Bild i chatten"
              />
            ) : null}
            <SafeAreaView style={styles.viewerClose} edges={['top']}>
              <IconButton
                icon="close"
                accessibilityLabel="Stäng bilden"
                onPress={() => setViewerUrl(null)}
              />
            </SafeAreaView>
          </View>
        </Modal>
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
  navTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  goneNotice: { textAlign: 'center', padding: Spacing.three },
  list: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: 2, flexGrow: 1 },
  reactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  reactionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: Typography.emoji,
  viewer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerClose: { position: 'absolute', top: 0, right: Spacing.three },
  bubblePressed: { opacity: 0.8 },
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
    ...Typography.input,
  },
});
