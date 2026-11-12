import { useEffect, useRef, useState } from 'react';
import { clockText } from '@/lib/time';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/avatar';
import { Skeleton } from '@/components/skeleton';
import { MeetupCard } from '@/features/chat/components/meetup-card';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { chatImageUrl, type Conversation, type Message } from '@/lib/api';
import { readersOf } from '@/lib/chat-state';
import { queryKeys } from '@/lib/query-keys';
import { formatDayDivider } from '@/lib/relative-time';
import { SIGNED_URL_REFRESH_MS } from '@/lib/queryClient';
import { SharedPostCard } from '@/features/feed/components/shared-post-card';

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

const DOUBLE_TAP_MS = 260;

export const QUICK_REACTION = '🔥';

function useTaps(onSingle: () => void, onDouble: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      onDouble();
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      onSingle();
    }, DOUBLE_TAP_MS);
  };
}

function ChatImage({
  path,
  corners,
  onOpen,
  onDoubleTap,
  onLongPress,
}: {
  path: string;
  corners: object;
  onOpen: (url: string) => void;
  onDoubleTap?: () => void;
  onLongPress: () => void;
}) {
  const { data: url } = useQuery({
    queryKey: queryKeys.chatImage(path),
    queryFn: () => chatImageUrl(path),
    staleTime: SIGNED_URL_REFRESH_MS,
    refetchInterval: SIGNED_URL_REFRESH_MS,
  });

  const handleTap = useTaps(
    () => url && onOpen(url),
    () => onDoubleTap?.(),
  );

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Bild, tryck för att visa stort"
      accessibilityHint={`Dubbeltryck för ${QUICK_REACTION}, håll inne för fler val`}
      onPress={onDoubleTap ? handleTap : () => url && onOpen(url)}
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

function groupReactions(reactions: Message['reactions'], myUserId: string | undefined) {
  const groups: { emoji: string; count: number; mine: boolean }[] = [];
  for (const reaction of reactions) {
    let group = groups.find((item) => item.emoji === reaction.emoji);
    if (!group) {
      group = { emoji: reaction.emoji, count: 0, mine: false };
      groups.push(group);
    }
    group.count += 1;
    if (reaction.user_id === myUserId) group.mine = true;
  }
  return groups;
}

function ReactionChips({
  reactions,
  myUserId,
  isMine,
  onToggle,
  onShowWho,
}: {
  reactions: Message['reactions'];
  myUserId: string | undefined;
  isMine: boolean;
  onToggle?: (emoji: string) => void;
  onShowWho?: () => void;
}) {
  const theme = useTheme();
  if (reactions.length === 0) return null;
  const groups = groupReactions(reactions, myUserId);

  return (
    <View style={[styles.reactions, isMine ? styles.reactionsMine : styles.reactionsTheirs]}>
      {groups.map((group) => (
        <Pressable
          key={group.emoji}
          accessibilityRole="button"
          accessibilityLabel={`${group.emoji} ${group.count}`}
          accessibilityState={{ selected: group.mine }}
          accessibilityHint={
            group.mine
              ? 'Tryck för att ta bort din reaktion, håll inne för att se vem'
              : 'Tryck för att reagera likadant, håll inne för att se vem'
          }
          disabled={!onToggle}
          onPress={() => onToggle?.(group.emoji)}
          onLongPress={onShowWho}
          delayLongPress={300}
          hitSlop={4}
          style={({ pressed }) => [
            styles.reactionChip,
            {
              backgroundColor: theme.backgroundSelected,
              borderColor: group.mine ? theme.brand : theme.background,
            },
            pressed && styles.bubblePressed,
          ]}
        >
          <ThemedText type="caption">{group.emoji}</ThemedText>
          {group.count > 1 ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {group.count}
            </ThemedText>
          ) : null}
        </Pressable>
      ))}
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
  return clockText(new Date(iso));
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
  onDoubleTap: (message: Message) => void;
  onToggleReaction: (message: Message, emoji: string) => void;
  onShowReactors: (message: Message) => void;
  onRetry: (message: Message) => void;
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
  onDoubleTap,
  onToggleReaction,
  onShowReactors,
  onRetry,
}: BubbleProps) {
  const theme = useTheme();
  const [showTime, setShowTime] = useState(false);
  const interactive = !message.pending && !message.failed;
  const handleTap = useTaps(
    () => setShowTime((current) => !current),
    () => onDoubleTap(message),
  );
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
          {message.post_id ? (
            <SharedPostCard postId={message.post_id} onLongPress={() => onLongPress(message)} />
          ) : null}
          {message.image_path ? (
            <ChatImage
              path={message.image_path}
              corners={corners}
              onOpen={onOpenImage}
              onDoubleTap={interactive ? () => onDoubleTap(message) : undefined}
              onLongPress={() => onLongPress(message)}
            />
          ) : null}
          {message.meetup_id ? (
            <MeetupCard meetupId={message.meetup_id} onLongPress={() => onLongPress(message)} />
          ) : null}
          {message.body.trim() ? (
            <Pressable
              accessibilityRole="button"
              onPress={
                message.failed ? () => onRetry(message) : interactive ? handleTap : undefined
              }
              onLongPress={() => onLongPress(message)}
              delayLongPress={300}
              accessibilityHint={
                message.failed
                  ? 'Tryck för att försöka igen'
                  : `Tryck för tiden, dubbeltryck för ${QUICK_REACTION}, håll inne för fler val`
              }
              style={({ pressed }) => [
                styles.bubble,
                corners,
                { backgroundColor: isMine ? theme.brand : theme.backgroundElement },
                message.failed && styles.pending,
                pressed && styles.bubblePressed,
              ]}
            >
              <ThemedText style={isMine ? { color: theme.brandText } : undefined}>
                {message.body}
              </ThemedText>
            </Pressable>
          ) : null}
          <ReactionChips
            reactions={message.reactions ?? []}
            myUserId={myUserId}
            isMine={isMine}
            onToggle={interactive ? (emoji) => onToggleReaction(message, emoji) : undefined}
            onShowWho={() => onShowReactors(message)}
          />
          {message.failed ? (
            <Pressable accessibilityRole="button" onPress={() => onRetry(message)} hitSlop={8}>
              <ThemedText type="caption" style={{ color: theme.danger }}>
                Skickades inte · Tryck för att försöka igen
              </ThemedText>
            </Pressable>
          ) : showTime ? (
            <ThemedText type="caption" themeColor="textSecondary" style={styles.time}>
              {clock(message.created_at)}
            </ThemedText>
          ) : null}
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
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: -Spacing.two,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  time: { paddingHorizontal: Spacing.two },
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
