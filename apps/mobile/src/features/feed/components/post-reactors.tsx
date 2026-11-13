import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { REACTIONS } from '@/constants/reactions';
import { Spacing, Typography } from '@/constants/theme';
import { useUserId } from '@/hooks/use-user-id';
import { type Post } from '@/lib/api';

export function PostReactors({ post }: { post: Post }) {
  const userId = useUserId();
  const groups = REACTIONS.map((emoji) => ({
    emoji,
    people: post.reactions.filter((reaction) => reaction.emoji === emoji),
  })).filter((group) => group.people.length > 0);

  return (
    <View style={styles.list}>
      <ThemedText type="headline" accessibilityRole="header">
        Reaktioner
      </ThemedText>
      {groups.length === 0 ? (
        <ThemedText themeColor="textSecondary">Ingen har reagerat ännu.</ThemedText>
      ) : (
        groups.map((group) => (
          <View key={group.emoji} style={styles.group}>
            <ThemedText
              style={Typography.emoji}
            >{`${group.emoji} ${group.people.length}`}</ThemedText>
            {group.people.map((reaction) => {
              const name =
                reaction.user_id === userId
                  ? 'Du'
                  : (reaction.profile?.display_name ?? 'Okänd användare');
              return (
                <View
                  key={reaction.user_id}
                  style={styles.row}
                  accessible
                  accessibilityLabel={`${name} ${group.emoji}`}
                >
                  <Avatar name={name} imageUrl={reaction.profile?.avatar_url ?? null} size={36} />
                  <ThemedText type="headline" numberOfLines={1} style={styles.name}>
                    {name}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.three, padding: Spacing.three },
  group: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  name: { flex: 1 },
});
