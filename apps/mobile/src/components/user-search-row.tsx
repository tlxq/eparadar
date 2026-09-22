import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Profile } from '@/lib/api';

export function UserSearchRow({ user }: { user: Profile }) {
  return (
    <>
      <Avatar name={user.display_name} imageUrl={user.avatar_url} size={32} />
      <View style={styles.text}>
        <ThemedText type="smallBold">{user.display_name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          @{user.username}
        </ThemedText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  text: { flex: 1, gap: Spacing.half },
});
