import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ConversationAvatar } from '@/components/conversation-avatar';
import { EmptyState } from '@/components/empty-state';
import { Fab } from '@/components/fab';
import { ListRow } from '@/components/list-row';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { conversationTitle, type Conversation } from '@/lib/api';
import { isUnread, readersOf } from '@/lib/chat-state';
import { formatChatTimestamp } from '@/lib/relative-time';
import { activeTypists, typingLabel, useTypingStore } from '@/store/typing';
import { useConversations } from '@/features/chat/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { useQueryErrorToast } from '@/hooks/use-query-error-toast';

function previewText(conversation: Conversation, myUserId: string) {
  const lastMessage = conversation.messages?.[0];
  if (!lastMessage) return conversation.is_group ? 'Gruppen är skapad' : 'Säg hej!';
  const text = lastMessage.body.trim() || 'skickade en bild';
  if (lastMessage.sender_id === myUserId) return `Du: ${text}`;
  if (!conversation.is_group) return lastMessage.body.trim() || 'Skickade en bild';
  const sender = conversation.conversation_members.find(
    (member) => member.user_id === lastMessage.sender_id,
  );
  const firstName = sender?.profiles.display_name.split(' ')[0];
  return firstName ? `${firstName}: ${text}` : text;
}

function RowMeta({ conversation, myUserId }: { conversation: Conversation; myUserId: string }) {
  const theme = useTheme();
  const lastMessage = conversation.messages?.[0];
  if (!lastMessage) return null;
  const unread = isUnread(conversation, myUserId);
  const seenBy =
    !conversation.is_group && lastMessage.sender_id === myUserId
      ? readersOf(conversation, lastMessage, myUserId)[0]
      : undefined;

  return (
    <View style={styles.meta}>
      <ThemedText
        type="caption"
        themeColor={unread ? 'brandOnSurface' : 'textSecondary'}
        style={unread && styles.metaStrong}
      >
        {formatChatTimestamp(lastMessage.created_at)}
      </ThemedText>
      {unread ? (
        <View
          accessibilityLabel="Oläst"
          style={[styles.unreadDot, { backgroundColor: theme.brand }]}
        />
      ) : seenBy ? (
        <View accessibilityLabel={`Sedd av ${seenBy.profiles.display_name}`}>
          <Avatar
            name={seenBy.profiles.display_name}
            imageUrl={seenBy.profiles.avatar_url}
            size={16}
          />
        </View>
      ) : (
        <View style={styles.metaSpacer} />
      )}
    </View>
  );
}

function ChatListSkeleton() {
  return (
    <View style={styles.skeleton}>
      {[0, 1, 2, 3].map((key) => (
        <View key={key} style={styles.skeletonRow}>
          <Skeleton width={52} height={52} radius={26} />
          <View style={styles.skeletonLines}>
            <Skeleton width="40%" />
            <Skeleton width="70%" />
          </View>
        </View>
      ))}
    </View>
  );
}

function useTicker(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

export default function ChatListScreen() {
  const theme = useTheme();
  const typingByConversation = useTypingStore((state) => state.byConversation);
  const anyTyping = Object.values(typingByConversation).some(
    (typists) => Object.keys(typists).length > 0,
  );
  const now = useTicker(anyTyping);
  const userId = useUserId();
  const tabBarInset = useTabBarInset();
  const [query, setQuery] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useConversations();

  useQueryErrorToast(isError, 'Kunde inte ladda chattarna.', refetch);

  const conversations = useMemo(() => {
    const all = data ?? [];
    const needle = query.trim().toLocaleLowerCase('sv-SE');
    if (!needle || !userId) return all;
    return all.filter((conversation) =>
      conversationTitle(conversation, userId).toLocaleLowerCase('sv-SE').includes(needle),
    );
  }, [data, query, userId]);

  const hasAny = (data?.length ?? 0) > 0;

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const title = conversationTitle(item, userId!);
            const unread = isUnread(item, userId!);
            const typing = typingLabel(
              activeTypists(typingByConversation[item.id], userId, now),
              item.is_group,
            );
            return (
              <ListRow
                title={title}
                subtitle={typing ?? previewText(item, userId!)}
                subtitleColor={typing ? 'brandOnSurface' : undefined}
                emphasized={unread}
                accessibilityLabel={unread ? `${title}, oläst` : title}
                leading={<ConversationAvatar conversation={item} myUserId={userId!} size={52} />}
                trailing={<RowMeta conversation={item} myUserId={userId!} />}
                onPress={() => router.push(`/chat/${item.id}`)}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: tabBarInset + Spacing.six }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <ScreenHeader title="Chatt" />
              {hasAny ? (
                <View style={[styles.search, { backgroundColor: theme.backgroundElement }]}>
                  <Ionicons name="search" size={18} color={theme.textSecondary} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Sök i chattar"
                    placeholderTextColor={theme.textSecondary}
                    accessibilityLabel="Sök i chattar"
                    returnKeyType="search"
                    style={[styles.searchInput, { color: theme.text }]}
                  />
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            isLoading ? (
              <ChatListSkeleton />
            ) : isError ? null : hasAny ? (
              <ThemedText themeColor="textSecondary" style={styles.noMatch}>
                Ingen chatt matchar &quot;{query.trim()}&quot;.
              </ThemedText>
            ) : (
              <EmptyState
                icon="chatbubbles-outline"
                title="Inga chattar än"
                message="Skriv till en vän eller starta en grupp inför nästa träff."
                action={{ label: 'Ny chatt', icon: 'add', onPress: () => router.push('/chat/new') }}
              />
            )
          }
        />
      </SafeAreaView>
      <Fab icon="add" accessibilityLabel="Ny chatt" onPress={() => router.push('/chat/new')} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerBlock: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.inter.regular,
    paddingVertical: Spacing.two,
  },
  meta: { alignItems: 'flex-end', gap: Spacing.one, minWidth: 40 },
  metaStrong: { fontFamily: Fonts.inter.bold },
  unreadDot: { width: 12, height: 12, borderRadius: 6 },
  metaSpacer: { height: 16 },
  noMatch: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  skeleton: { paddingHorizontal: Spacing.three, gap: Spacing.four, paddingTop: Spacing.two },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  skeletonLines: { flex: 1, gap: Spacing.two },
});
