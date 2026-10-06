import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
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
import {
  conversationAvatarUrl,
  conversationTitle,
  fetchConversations,
  type Conversation,
} from '@/lib/api';
import { isUnread, readersOf } from '@/lib/chat-state';
import { queryKeys } from '@/lib/query-keys';
import { formatChatTimestamp } from '@/lib/relative-time';
import { showToast } from '@/store/toast';
import { useAuthStore } from '@/store/auth';

function previewText(conversation: Conversation, myUserId: string) {
  const lastMessage = conversation.messages?.[0];
  if (!lastMessage) return conversation.is_group ? 'Gruppen är skapad' : 'Säg hej!';
  if (lastMessage.sender_id === myUserId) return `Du: ${lastMessage.body}`;
  if (!conversation.is_group) return lastMessage.body;
  const sender = conversation.conversation_members.find(
    (member) => member.user_id === lastMessage.sender_id,
  );
  const firstName = sender?.profiles.display_name.split(' ')[0];
  return firstName ? `${firstName}: ${lastMessage.body}` : lastMessage.body;
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

export default function ChatListScreen() {
  const theme = useTheme();
  const userId = useAuthStore((state) => state.session?.user.id);
  const tabBarInset = useTabBarInset();
  const [query, setQuery] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.conversations(userId),
    queryFn: fetchConversations,
    enabled: !!userId,
  });

  useEffect(() => {
    if (isError) {
      showToast({
        tone: 'error',
        message: 'Kunde inte ladda chattarna.',
        action: { label: 'Försök igen', onPress: () => refetch() },
      });
    }
  }, [isError, refetch]);

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
            return (
              <ListRow
                title={title}
                subtitle={previewText(item, userId!)}
                emphasized={unread}
                accessibilityLabel={unread ? `${title}, oläst` : title}
                leading={
                  <Avatar name={title} imageUrl={conversationAvatarUrl(item, userId!)} size={52} />
                }
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
