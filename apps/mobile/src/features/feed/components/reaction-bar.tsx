import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { REACTIONS } from '@/constants/reactions';
import { usePostReaction } from '@/features/feed/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/hooks/use-user-id';
import { type Post } from '@/lib/api';

function whoReacted(post: Post) {
  const byPerson = new Map<string, { name: string; avatarUrl: string | null; emojis: string[] }>();
  post.reactions.forEach((reaction) => {
    const entry = byPerson.get(reaction.user_id) ?? {
      name: reaction.profile?.display_name ?? 'Okänd',
      avatarUrl: reaction.profile?.avatar_url ?? null,
      emojis: [],
    };
    entry.emojis.push(reaction.emoji);
    byPerson.set(reaction.user_id, entry);
  });
  return [...byPerson.entries()];
}

export function ReactionBar({ post }: { post: Post }) {
  const theme = useTheme();
  const userId = useUserId();
  const react = usePostReaction();
  const [listOpen, setListOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const myEmojis = post.reactions.filter((r) => r.user_id === userId).map((r) => r.emoji);
  const people = whoReacted(post);

  return (
    <View style={styles.row}>
      {REACTIONS.map((emoji) => {
        const count = post.reactions.filter((r) => r.emoji === emoji).length;
        if (count === 0) return null;
        const mine = post.reactions.some((r) => r.emoji === emoji && r.user_id === userId);
        return (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityState={{ selected: mine }}
            accessibilityLabel={mine ? `Ta bort din ${emoji}` : `Reagera med ${emoji}`}
            onPress={() => react(post, emoji)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: mine ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: mine ? theme.brand : 'transparent',
              },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="small">{emoji}</ThemedText>
            <ThemedText type="smallBold" themeColor={mine ? 'text' : 'textSecondary'}>
              {count}
            </ThemedText>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reagera"
        onPress={() => setPickerOpen(true)}
        style={({ pressed }) => [
          styles.chip,
          { backgroundColor: theme.backgroundElement, borderColor: 'transparent' },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="happy-outline" size={18} color={theme.textSecondary} />
      </Pressable>
      {people.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Visa vem som reagerade"
          onPress={() => setListOpen(true)}
          hitSlop={8}
          style={({ pressed }) => [styles.who, pressed && styles.pressed]}
        >
          <View style={styles.faces}>
            {people.slice(0, 3).map(([id, person], index) => (
              <View key={id} style={index > 0 && styles.overlap}>
                <Avatar name={person.name} imageUrl={person.avatarUrl} size={20} />
              </View>
            ))}
          </View>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {people.length === 1 ? people[0][1].name.split(' ')[0] : `${people.length} st`}
          </ThemedText>
        </Pressable>
      ) : null}
      <ActionSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        actions={[]}
        header={
          <View style={styles.picker} accessibilityRole="toolbar">
            {REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Reagera med ${emoji}`}
                accessibilityState={{ selected: myEmojis.includes(emoji) }}
                onPress={() => {
                  setPickerOpen(false);
                  react(post, emoji);
                }}
                style={({ pressed }) => [
                  styles.pick,
                  myEmojis.includes(emoji) && { backgroundColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={Typography.emoji}>{emoji}</ThemedText>
              </Pressable>
            ))}
          </View>
        }
      />
      <ActionSheet
        visible={listOpen}
        title="Reaktioner"
        onClose={() => setListOpen(false)}
        actions={[]}
        header={
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {people.map(([id, person]) => (
              <View key={id} style={styles.person}>
                <Avatar name={person.name} imageUrl={person.avatarUrl} size={36} />
                <ThemedText type="headline" numberOfLines={1} style={styles.personName}>
                  {person.name}
                </ThemedText>
                <ThemedText>{person.emojis.join(' ')}</ThemedText>
              </View>
            ))}
          </ScrollView>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 32,
    paddingHorizontal: Spacing.two + Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  pressed: { opacity: 0.7 },
  who: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.one,
  },
  faces: { flexDirection: 'row' },
  overlap: { marginLeft: -6 },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
  },
  pick: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { maxHeight: 360 },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.two },
  person: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  personName: { flex: 1 },
});
