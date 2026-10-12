import { StyleSheet, View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import type { Conversation, Message } from '@/lib/api';

type ReactorsSheetProps = {
  message: Message | null;
  conversation: Conversation | undefined;
  myUserId: string | undefined;
  onClose: () => void;
};

export function ReactorsSheet({ message, conversation, myUserId, onClose }: ReactorsSheetProps) {
  const people = new Map(
    (conversation?.conversation_members ?? []).map((member) => [member.user_id, member.profiles]),
  );
  const reactions = message?.reactions ?? [];

  return (
    <ActionSheet
      visible={!!message}
      onClose={onClose}
      actions={[]}
      header={
        <View style={styles.list}>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.title}>
            Reaktioner
          </ThemedText>
          {reactions.map((reaction) => {
            const person = people.get(reaction.user_id);
            const name =
              reaction.user_id === myUserId ? 'Du' : (person?.display_name ?? 'Okänd användare');
            return (
              <View
                key={reaction.user_id}
                style={styles.row}
                accessible
                accessibilityLabel={`${name} ${reaction.emoji}`}
              >
                <Avatar name={name} imageUrl={person?.avatar_url} size={36} />
                <ThemedText type="headline" style={styles.name} numberOfLines={1}>
                  {name}
                </ThemedText>
                <ThemedText style={Typography.emoji}>{reaction.emoji}</ThemedText>
              </View>
            );
          })}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two, paddingHorizontal: Spacing.two, paddingBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  name: { flex: 1 },
  title: { textAlign: 'center' },
});
