import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { SectionLabel } from '@/components/section-label';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { carColorHex } from '@/features/map/car-colors';
import { latestCarColor } from '@/features/map/markers';
import { useTheme } from '@/hooks/use-theme';
import { type FriendLocation } from '@/lib/api';

const AVATAR = 68;
const ITEM_WIDTH = AVATAR + 24;

function liveStatus(friend: FriendLocation) {
  if (!friend.status_text) return null;
  if (friend.status_expires_at && new Date(friend.status_expires_at).getTime() < Date.now()) {
    return null;
  }
  return friend.status_text;
}

export function OnMapRow({ friends }: { friends: FriendLocation[] }) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <SectionLabel>På kartan nu</SectionLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {friends.map((friend) => {
          const name = friend.profile.display_name;
          const status = liveStatus(friend);
          const ring = carColorHex(latestCarColor(friend.profile.cars));
          return (
            <Pressable
              key={friend.user_id}
              accessibilityRole="button"
              accessibilityLabel={
                status ? `${name} är på kartan: ${status}` : `${name} är på kartan`
              }
              onPress={() =>
                router.navigate({ pathname: '/karta', params: { focus: friend.user_id } })
              }
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={[styles.ring, { borderColor: ring }]}>
                <Avatar name={name} imageUrl={friend.profile.avatar_url} size={AVATAR} />
              </View>
              {status ? (
                <View
                  style={[
                    styles.bubble,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.background },
                  ]}
                >
                  <ThemedText type="caption" numberOfLines={1}>
                    {status}
                  </ThemedText>
                </View>
              ) : null}
              <ThemedText type="caption" numberOfLines={1} style={styles.name}>
                {name.split(' ')[0]}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two, paddingBottom: Spacing.three },
  row: { gap: Spacing.two, paddingRight: Spacing.three },
  item: { alignItems: 'center', width: ITEM_WIDTH },
  pressed: { opacity: 0.7 },
  ring: { borderWidth: 2.5, borderRadius: (AVATAR + 10) / 2, padding: 2.5 },
  bubble: {
    marginTop: -Spacing.three,
    maxWidth: ITEM_WIDTH,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  name: { maxWidth: ITEM_WIDTH, marginTop: Spacing.one },
});
