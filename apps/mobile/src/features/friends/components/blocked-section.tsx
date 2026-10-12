import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useBlockedUsers, useUnblockUser } from '@/features/friends/hooks';
import { SettingsGroup } from '@/features/profile/components/settings-rows';
import { useUserId } from '@/hooks/use-user-id';
import { friendProfile } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { showToast } from '@/store/toast';

export function BlockedSection({ children }: { children?: ReactNode }) {
  const userId = useUserId();
  const { data: blocked, isPending, isError, refetch } = useBlockedUsers();
  const unblock = useUnblockUser();

  function body() {
    if (isError && !blocked) {
      return (
        <View style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
            Blockerade gick inte att ladda.
          </ThemedText>
          <Button label={Common.retry} size="sm" variant="secondary" onPress={() => refetch()} />
        </View>
      );
    }
    if (isPending || !userId) {
      return (
        <View style={styles.row}>
          <Skeleton width={40} height={40} radius={20} />
          <Skeleton width="50%" height={14} />
        </View>
      );
    }
    if (!blocked?.length) {
      return (
        <View style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary">
            Du har inte blockerat någon.
          </ThemedText>
        </View>
      );
    }
    return blocked.map((row) => {
      const person = friendProfile(row, userId);
      return (
        <View key={row.id} style={styles.row}>
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
                onError: (error) => showToast({ tone: 'error', message: getErrorMessage(error) }),
              })
            }
          />
        </View>
      );
    });
  }

  return (
    <>
      <SettingsGroup>
        <View style={styles.header}>
          <ThemedText type="headline">Blockerade</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            De kan inte se dig eller skriva till dig.
          </ThemedText>
        </View>
        {body()}
        {children}
      </SettingsGroup>
      {blocked?.length ? (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.note}>
          Avblockerar du någon blir ni inte kompisar igen av sig själv.
        </ThemedText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  note: { paddingHorizontal: Spacing.three },
  header: { gap: Spacing.half, padding: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  text: { flex: 1, gap: Spacing.half },
});
