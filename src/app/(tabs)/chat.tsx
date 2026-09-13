import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { conversationTitle, fetchConversations, type Conversation } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

function ConversationRow({
  conversation,
  myUserId,
}: {
  conversation: Conversation;
  myUserId: string;
}) {
  const lastMessage = conversation.messages?.[0];
  const title = conversationTitle(conversation, myUserId);
  return (
    <Pressable onPress={() => router.push(`/chat/${conversation.id}`)}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <Avatar name={title} />
        <View style={styles.rowText}>
          <ThemedText type="smallBold">{title}</ThemedText>
          {lastMessage ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {lastMessage.body}
            </ThemedText>
          ) : null}
        </View>
      </ThemedView>
    </Pressable>
  );
}

export default function ChatListScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations', userId],
    queryFn: fetchConversations,
    enabled: !!userId,
  });

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="title">Chatt</ThemedText>
          <Button label="Ny chatt" icon="add-circle-outline" onPress={() => router.push('/chat/new')} />
        </View>
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationRow conversation={item} myUserId={userId!} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            !isLoading ? <ThemedText themeColor="textSecondary">Inga chattar än.</ThemedText> : null
          }
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  list: { gap: Spacing.two, paddingBottom: Spacing.four },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowText: { flex: 1, gap: Spacing.half },
});
