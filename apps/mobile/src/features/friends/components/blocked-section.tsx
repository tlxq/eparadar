import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useBlockedUsers, useUnblockUser } from '@/features/friends/hooks';
import { useTheme } from '@/hooks/use-theme';
import { useUserId } from '@/hooks/use-user-id';
import { friendProfile } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { showToast } from '@/store/toast';

export function BlockedSection() {
  const theme = useTheme();
  const userId = useUserId();
  const { data: blocked } = useBlockedUsers();
  const unblock = useUnblockUser();

  if (!userId || !blocked?.length) return null;

  return (
    <>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
        BLOCKERADE
      </ThemedText>
      <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
        {blocked.map((row, index) => {
          const person = friendProfile(row, userId);
          return (
            <View key={row.id}>
              {index > 0 ? (
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
              ) : null}
              <View style={styles.row}>
                <Avatar name={person.display_name} imageUrl={person.avatar_url} size={40} />
                <View style={styles.text}>
                  <ThemedText type="headline" numberOfLines={1}>
                    {person.display_name}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    @{person.username}
                  </ThemedText>
                </View>
                <Button
                  label="Avblockera"
                  size="sm"
                  variant="secondary"
                  loading={unblock.isPending && unblock.variables === person.id}
                  onPress={() =>
                    unblock.mutate(person.id, {
                      onSuccess: () =>
                        showToast({ message: `${person.display_name} är inte längre blockerad.` }),
                      onError: (error) =>
                        showToast({ tone: 'error', message: getErrorMessage(error) }),
                    })
                  }
                />
              </View>
            </View>
          );
        })}
      </View>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.note}>
        Blockerade kan inte skicka vänförfrågningar eller meddelanden till dig. Om du avblockerar
        någon blir ni inte vänner igen av sig själv.
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  label: { letterSpacing: 0.6, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  note: { paddingHorizontal: Spacing.three },
  group: { borderRadius: Radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  text: { flex: 1, gap: Spacing.half },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
});
