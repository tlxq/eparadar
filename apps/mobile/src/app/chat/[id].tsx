import { useEffect, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { FlatList, Image, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { DropdownButton } from '@/components/dropdown-menu';
import { Avatar } from '@/components/avatar';
import { ConversationAvatar } from '@/components/conversation-avatar';
import { IconButton } from '@/components/icon-button';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ScreenBackground } from '@/components/screen-background';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
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
import { showToast, showUndoToast } from '@/store/toast';
import { activeTypists, TYPING_TTL_MS, typingLabel, useTypingStore } from '@/store/typing';
import { useProfile } from '@/features/profile/hooks';
import { useConversation } from '@/features/chat/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { pickImage, type ImageSource } from '@/lib/pick-image';
import {
  MessageBubble,
  QUICK_REACTION,
  REACTIONS,
  ReadReceipt,
  TypingBubble,
} from '@/features/chat/components/message-bubble';
import { ImagePreview } from '@/features/chat/components/image-preview';
import { ReactorsSheet } from '@/features/chat/components/reactors-sheet';
import { Common } from '@/constants/strings';
import { confirmDestructive } from '@/lib/confirm';
import { openReport } from '@/store/report-sheet';
const LOADING_BUBBLES = [
  { width: '55%', mine: false },
  { width: '40%', mine: true },
  { width: '65%', mine: false },
  { width: '35%', mine: true },
] as const;

const VIEWER_CLOSE_MS = 250;

export default function ConversationScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<Message>>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState<Message | null>(null);
  const [viewer, setViewer] = useState<{ url: string; message: Message } | null>(null);
  const [reactorsOf, setReactorsOf] = useState<Message | null>(null);
  const [failed, setFailed] = useState<Message[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
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

  const {
    data: messages,
    isError: messagesError,
    refetch: refetchMessages,
  } = useQuery({
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
    showToast({ tone: 'success', message: 'Kopierat!' });
  }

  async function handleUnsend(message: Message) {
    const ok = await confirmDestructive({
      title: 'Ångra skickat?',
      message: 'Meddelandet tas bort för alla i chatten.',
      confirmLabel: 'Ångra skickat',
      icon: 'arrow-undo-outline',
    });
    if (!ok) return;
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

  function setMyReaction(messageId: string, emoji: string | null) {
    if (!userId) return;
    queryClient.setQueryData<Message[]>(queryKeys.messages(id), (current) =>
      current?.map((message) =>
        message.id === messageId
          ? {
              ...message,
              reactions: [
                ...(message.reactions ?? []).filter((reaction) => reaction.user_id !== userId),
                ...(emoji ? [{ user_id: userId, emoji }] : []),
              ],
            }
          : message,
      ),
    );
  }

  async function handleReact(message: Message, emoji: string) {
    setSelected(null);
    tapHaptic();
    const removing = message.reactions?.some(
      (reaction) => reaction.user_id === userId && reaction.emoji === emoji,
    );
    setMyReaction(message.id, removing ? null : emoji);
    try {
      await toggleReaction(message.id, emoji);
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
      return;
    } finally {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
    }
    if (!removing) return;
    showUndoToast({
      message: `${emoji} borttagen.`,
      onUndo: async () => {
        try {
          await toggleReaction(message.id, emoji);
          queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
        } catch (error) {
          showToast({ tone: 'error', message: getErrorMessage(error) });
        }
      },
    });
  }

  function handleDoubleTap(message: Message) {
    const mine = message.reactions?.find((reaction) => reaction.user_id === userId);
    if (mine?.emoji === QUICK_REACTION) {
      tapHaptic();
      return;
    }
    handleReact(message, QUICK_REACTION);
  }

  async function handlePickImage(source: ImageSource) {
    if (!id || !userId) return;
    const uri = await pickImage({ quality: 0.7, source });
    if (uri) setPreviewUri(uri);
  }

  async function handleSendImage(caption: string) {
    if (!id || !userId || !previewUri) return;
    setSending(true);
    try {
      const imagePath = await uploadChatImage(id, previewUri);
      await sendMessage({ conversationId: id, senderId: userId, body: caption, imagePath });
      setPreviewUri(null);
      tapHaptic();
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
    } catch (error) {
      showToast({ tone: 'error', message: `Bilden skickades inte. ${getErrorMessage(error)}` });
    } finally {
      setSending(false);
    }
  }

  async function deliver(draft: Message) {
    if (!id || !userId) return;
    const key = queryKeys.messages(id);
    await queryClient.cancelQueries({ queryKey: key });
    queryClient.setQueryData<Message[]>(key, (current) => [...(current ?? []), draft]);
    try {
      await sendMessage({
        id: draft.id,
        conversationId: id,
        senderId: userId,
        body: draft.body,
      });
      queryClient.setQueryData<Message[]>(key, (current) =>
        current?.map((message) =>
          message.id === draft.id ? { ...message, pending: false } : message,
        ),
      );
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
    } catch {
      queryClient.setQueryData<Message[]>(key, (current) =>
        current?.filter((message) => message.id !== draft.id),
      );
      setFailed((current) => [...current, { ...draft, pending: false, failed: true }]);
    }
  }

  function handleRetry(message: Message) {
    setFailed((current) => current.filter((item) => item.id !== message.id));
    tapHaptic();
    deliver({ ...message, failed: false, pending: true, created_at: new Date().toISOString() });
  }

  function handleDiscard(message: Message) {
    setFailed((current) => current.filter((item) => item.id !== message.id));
  }

  async function handleSend() {
    const text = body.trim();
    if (!userId || !id || !text) return;
    const draft: Message = {
      id: randomId(),
      conversation_id: id,
      sender_id: userId,
      body: text,
      image_path: null,
      post_id: null,
      meetup_id: null,
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
    await deliver(draft);
  }

  function reportImage(message: Message) {
    setViewer(null);
    setTimeout(
      () =>
        openReport({
          type: 'message',
          id: message.id,
          userId: message.sender_id,
          name: message.sender?.display_name ?? 'personen',
        }),
      VIEWER_CLOSE_MS,
    );
  }

  const selectedIsMine = !!selected && selected.sender_id === userId;
  const selectedIsRead =
    !!selected &&
    !!conversation &&
    !!userId &&
    readersOf(conversation, selected, userId).length > 0;
  const selectedActions: SheetAction[] = selected?.failed
    ? [
        {
          label: 'Försök igen',
          icon: 'refresh-outline',
          onPress: () => handleRetry(selected),
        },
        {
          label: 'Släng',
          icon: 'trash-outline',
          destructive: true,
          onPress: () => handleDiscard(selected),
        },
      ]
    : selected
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
                  label: 'Ångra skickat',
                  icon: 'arrow-undo-outline' as const,
                  destructive: true,
                  disabled: selectedIsRead,
                  hint: selectedIsRead ? 'Redan läst, kan inte ångras' : 'Tas bort för alla',
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
  const list = [
    ...(messages ?? []),
    ...failed.filter((draft) => !messages?.some((message) => message.id === draft.id)),
  ];
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
              <View style={styles.navName}>
                <ThemedText
                  type="headline"
                  numberOfLines={1}
                  accessibilityRole="header"
                  style={styles.navNameText}
                >
                  {title}
                </ThemedText>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </View>
              {isGroup ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {memberCount} medlemmar
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
                onOpenImage={(url) => setViewer({ url, message: item })}
                onDoubleTap={handleDoubleTap}
                onToggleReaction={handleReact}
                onShowReactors={(message) => {
                  pressHaptic();
                  setReactorsOf(message);
                }}
                onRetry={handleRetry}
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
              messagesError && !messages ? (
                <ErrorState
                  message="Meddelandena gick inte att hämta. Kolla nätet och testa igen."
                  onRetry={refetchMessages}
                />
              ) : !messages ? (
                <View
                  style={styles.loadingThread}
                  accessibilityLabel="Laddar meddelanden"
                  accessibilityRole="progressbar"
                >
                  {LOADING_BUBBLES.map((bubble, index) => (
                    <Skeleton
                      key={index}
                      width={bubble.width}
                      height={36}
                      radius={Radius.lg}
                      style={{ alignSelf: bubble.mine ? 'flex-end' : 'flex-start' }}
                    />
                  ))}
                </View>
              ) : messages ? (
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
            selected && !selected.failed ? (
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
        <ReactorsSheet
          message={reactorsOf}
          conversation={conversation}
          myUserId={userId}
          onClose={() => setReactorsOf(null)}
        />
        <ImagePreview
          key={previewUri ?? 'none'}
          uri={previewUri}
          sending={sending}
          onCancel={() => setPreviewUri(null)}
          onSend={handleSendImage}
        />
        <Modal
          visible={!!viewer}
          transparent
          animationType="fade"
          onRequestClose={() => setViewer(null)}
        >
          <View style={[styles.viewer, { backgroundColor: theme.scrim }]}>
            {viewer ? (
              <Image
                source={{ uri: viewer.url }}
                style={styles.viewerImage}
                resizeMode="contain"
                accessibilityLabel="Bild i chatten"
              />
            ) : null}
            <SafeAreaView style={styles.viewerClose} edges={['top']}>
              {viewer && viewer.message.sender_id !== userId ? (
                <DropdownButton
                  accessibilityLabel="Fler val för bilden"
                  items={[
                    {
                      label: Common.report,
                      icon: 'flag-outline',
                      onPress: () => reportImage(viewer.message),
                    },
                  ]}
                />
              ) : null}
              <IconButton
                icon="close"
                accessibilityLabel="Stäng bilden"
                onPress={() => setViewer(null)}
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
  navName: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  navNameText: { flexShrink: 1 },
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
  viewer: { flex: 1, justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerClose: {
    position: 'absolute',
    top: 0,
    right: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bubblePressed: { opacity: 0.8 },
  center: { textAlign: 'center' },
  loadingThread: { gap: Spacing.two, paddingTop: Spacing.two },
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
