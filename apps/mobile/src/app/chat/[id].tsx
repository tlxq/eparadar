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
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { useTheme } from '@/hooks/use-theme';
import {
  chatImageUrl,
  conversationTitle,
  fetchMessages,
  markConversationRead,
  sendMessage,
  toggleReaction,
  unsendMessage,
  type Conversation,
  type Message,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { uploadChatImage } from '@/lib/image-upload';
import { readersOf } from '@/lib/chat-state';
import { queryKeys } from '@/lib/query-keys';
import { formatDayDivider } from '@/lib/relative-time';
import { sendStoppedTyping, sendTyping } from '@/lib/typing';
import { showToast } from '@/store/toast';
import { activeTypists, TYPING_TTL_MS, typingLabel, useTypingStore } from '@/store/typing';
import { useProfile } from '@/features/profile/hooks';
import { useConversation } from '@/features/chat/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { pickImage } from '@/lib/pick-image';

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

const MAX_READER_AVATARS = 5;
const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];
const IMAGE_WIDTH = 220;
const IMAGE_HEIGHT = 165;
const SIGNED_URL_STALE_MS = 50 * 60 * 1000;

function ChatImage({
  path,
  corners,
  onOpen,
  onLongPress,
}: {
  path: string;
  corners: object;
  onOpen: (url: string) => void;
  onLongPress: () => void;
}) {
  const { data: url } = useQuery({
    queryKey: queryKeys.chatImage(path),
    queryFn: () => chatImageUrl(path),
    staleTime: SIGNED_URL_STALE_MS,
  });

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Bild, tryck för att visa stort"
      onPress={() => url && onOpen(url)}
      onLongPress={onLongPress}
      delayLongPress={300}
    >
      {url ? (
        <Image source={{ uri: url }} style={[styles.image, corners]} />
      ) : (
        <Skeleton width={IMAGE_WIDTH} height={IMAGE_HEIGHT} radius={ROUND} />
      )}
    </Pressable>
  );
}

function ReactionChips({
  reactions,
  myUserId,
  isMine,
}: {
  reactions: Message['reactions'];
  myUserId: string | undefined;
  isMine: boolean;
}) {
  const theme = useTheme();
  if (reactions.length === 0) return null;
  const emojis = [...new Set(reactions.map((reaction) => reaction.emoji))].slice(0, 3);
  const mine = reactions.some((reaction) => reaction.user_id === myUserId);

  return (
    <View
      accessibilityLabel={`Reaktioner: ${reactions.map((reaction) => reaction.emoji).join(' ')}`}
      style={[
        styles.reactions,
        isMine ? styles.reactionsMine : styles.reactionsTheirs,
        {
          backgroundColor: theme.backgroundSelected,
          borderColor: mine ? theme.brand : theme.background,
        },
      ]}
    >
      <ThemedText type="caption">{emojis.join('')}</ThemedText>
      {reactions.length > 1 ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {reactions.length}
        </ThemedText>
      ) : null}
    </View>
  );
}

function TypingBubble({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.typingRow} accessibilityLiveRegion="polite" accessibilityLabel={label}>
      <View style={[styles.typingBubble, { backgroundColor: theme.backgroundElement }]}>
        {[0.45, 0.7, 1].map((opacity) => (
          <View
            key={opacity}
            style={[styles.typingDot, { backgroundColor: theme.textSecondary, opacity }]}
          />
        ))}
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

function ReadReceipt({
  conversation,
  message,
  myUserId,
}: {
  conversation: Conversation;
  message: Message;
  myUserId: string;
}) {
  const readers = readersOf(conversation, message, myUserId);
  if (readers.length === 0) return null;

  if (!conversation.is_group) {
    if (message.sender_id !== myUserId) return null;
    return (
      <ThemedText type="caption" themeColor="textSecondary" style={styles.seen}>
        Sedd {clock(readers[0].last_read_at!)}
      </ThemedText>
    );
  }

  const extra = readers.length - MAX_READER_AVATARS;
  return (
    <View
      style={styles.readers}
      accessibilityLabel={`Läst av ${readers.map((reader) => reader.profiles.display_name).join(', ')}`}
    >
      {readers.slice(0, MAX_READER_AVATARS).map((reader) => (
        <Avatar
          key={reader.user_id}
          name={reader.profiles.display_name}
          imageUrl={reader.profiles.avatar_url}
          size={16}
        />
      ))}
      {extra > 0 ? (
        <ThemedText type="caption" themeColor="textSecondary">
          +{extra}
        </ThemedText>
      ) : null}
    </View>
  );
}

type BubbleProps = {
  message: Message;
  previous?: Message;
  next?: Message;
  isMine: boolean;
  showNames: boolean;
  myUserId: string | undefined;
  onLongPress: (message: Message) => void;
  onOpenImage: (url: string) => void;
};

function MessageBubble({
  message,
  previous,
  next,
  isMine,
  showNames,
  myUserId,
  onLongPress,
  onOpenImage,
}: BubbleProps) {
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
        <View style={[styles.bubbleColumn, isMine && styles.bubbleColumnMine]}>
          {message.image_path ? (
            <ChatImage
              path={message.image_path}
              corners={corners}
              onOpen={onOpenImage}
              onLongPress={() => onLongPress(message)}
            />
          ) : null}
          {message.body.trim() ? (
            <Pressable
              onLongPress={() => onLongPress(message)}
              delayLongPress={300}
              accessibilityHint="Håll inne för fler val"
              style={({ pressed }) => [
                styles.bubble,
                corners,
                { backgroundColor: isMine ? theme.brand : theme.backgroundElement },
                pressed && styles.bubblePressed,
              ]}
            >
              <ThemedText style={isMine ? { color: theme.brandText } : undefined}>
                {message.body}
              </ThemedText>
            </Pressable>
          ) : null}
          <ReactionChips reactions={message.reactions ?? []} myUserId={myUserId} isMine={isMine} />
        </View>
      </View>
    </View>
  );
}

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
    try {
      await toggleReaction(message.id, emoji);
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  async function handlePickImage() {
    if (!id || !userId) return;
    const uri = await pickImage({ quality: 0.7 });
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
    setSending(true);
    try {
      await sendMessage({ conversationId: id, senderId: userId, body: text });
      setBody('');
      sendStoppedTyping(id, userId, myName);
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
                label: 'Ta bort',
                icon: 'trash-outline' as const,
                destructive: true,
                disabled: selectedIsRead,
                hint: selectedIsRead ? 'Redan läst, kan inte tas bort' : undefined,
                onPress: () => handleUnsend(selected),
              },
            ]
          : []),
      ]
    : [];

  const title = conversation && userId ? conversationTitle(conversation, userId) : 'Chatt';
  const isGroup = !!conversation?.is_group;
  const memberCount = conversation?.conversation_members.length ?? 0;
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
            accessibilityLabel="Tillbaka"
            onPress={() => router.back()}
          />
          <Pressable
            disabled={!isGroup}
            accessibilityRole={isGroup ? 'button' : undefined}
            accessibilityHint={isGroup ? 'Öppnar gruppinfo' : undefined}
            onPress={() => router.push(`/group/${id}`)}
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
                onLongPress={setSelected}
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
              icon="image-outline"
              size={44}
              accessibilityLabel="Skicka en bild"
              onPress={handlePickImage}
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
  groupStart: { marginTop: Spacing.two },
  bubbleColumn: { maxWidth: '78%', gap: 2, alignItems: 'flex-start' },
  bubbleColumnMine: { alignItems: 'flex-end' },
  image: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT, borderRadius: ROUND },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    marginTop: -Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  reactionsMine: { alignSelf: 'flex-end', marginRight: Spacing.two },
  reactionsTheirs: { alignSelf: 'flex-start', marginLeft: Spacing.two },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  typingBubble: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: ROUND,
  },
  typingDot: { width: 7, height: 7, borderRadius: 4 },
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
  reactionEmoji: { fontSize: 26, lineHeight: 32 },
  viewer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerClose: { position: 'absolute', top: 0, right: Spacing.three },
  divider: { alignSelf: 'center', paddingVertical: Spacing.two },
  senderName: { marginLeft: AVATAR_SIZE + Spacing.two + Spacing.two, marginBottom: Spacing.half },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubblePressed: { opacity: 0.8 },
  seen: { alignSelf: 'flex-end', paddingTop: Spacing.one },
  readers: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    gap: Spacing.half,
    paddingTop: Spacing.one,
  },
  avatarSpacer: { width: AVATAR_SIZE },
  bubble: {
    maxWidth: '100%',
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
