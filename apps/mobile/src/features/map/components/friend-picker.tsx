import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FriendLocation } from '@/lib/api';

type FriendPickerProps = {
  mode: 'search' | 'friends';
  bottom: number;
  friends: FriendLocation[] | undefined;
  onPick: (friend: FriendLocation) => void;
  onClose: () => void;
};

export function FriendPicker({ mode, bottom, friends, onPick, onClose }: FriendPickerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const all = friends ?? [];
    const needle = query.trim().toLowerCase();
    if (mode !== 'search' || !needle) return all;
    return all.filter((f) => f.profile.display_name.toLowerCase().includes(needle));
  }, [friends, mode, query]);

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View
        style={[
          styles.panel,
          mode === 'search' ? { top: insets.top + Spacing.three } : { bottom },
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            shadowColor: theme.scrim,
          },
        ]}
      >
        {mode === 'search' && (
          <TextField placeholder="Sök kompis" value={query} onChangeText={setQuery} autoFocus />
        )}
        <FlatList
          data={results}
          keyExtractor={(item) => item.user_id}
          style={styles.list}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Visa ${item.profile.display_name} på kartan`}
              onPress={() => onPick(item)}
              style={styles.row}
              hitSlop={4}
            >
              <Avatar
                name={item.profile.display_name}
                imageUrl={item.profile.avatar_url}
                size={32}
              />
              <ThemedText type="smallBold">{item.profile.display_name}</ThemedText>
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              {mode === 'search' && query.trim() && (friends?.length ?? 0) > 0
                ? `Ingen kompis matchar "${query.trim()}".`
                : 'Inga kompisar delar sin plats just nu.'}
            </ThemedText>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    maxHeight: 280,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  empty: { paddingVertical: Spacing.two },
});
