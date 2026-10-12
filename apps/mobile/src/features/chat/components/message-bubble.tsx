import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/avatar';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { chatImageUrl, type Conversation, type Message } from '@/lib/api';
import { readersOf } from '@/lib/chat-state';
import { queryKeys } from '@/lib/query-keys';
import { formatDayDivider } from '@/lib/relative-time';
import { SIGNED_URL_REFRESH_MS } from '@/lib/queryClient';

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

export const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

const IMAGE_WIDTH = 220;

const IMAGE_HEIGHT = 165;

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
    staleTime: SIGNED_URL_REFRESH_MS,
    refetchInterval: SIGNED_URL_REFRESH_MS,
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

export function TypingBubble({ label }: { label: string }) {
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

export function ReadReceipt({
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

export function MessageBubble({
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
        <View
          style={[
            styles.bubbleColumn,
            isMine && styles.bubbleColumnMine,
            message.pending && styles.pending,
          ]}
        >
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

const styles = StyleSheet.create({
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
  divider: { alignSelf: 'center', paddingVertical: Spacing.two },
  senderName: { marginLeft: AVATAR_SIZE + Spacing.two + Spacing.two, marginBottom: Spacing.half },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubblePressed: { opacity: 0.8 },
  pending: { opacity: 0.6 },
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
});
