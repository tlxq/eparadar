import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { SettingsGroup, SwitchRow } from '@/features/profile/components/settings-rows';
import {
  useNotificationSettings,
  useSetNotificationSetting,
} from '@/features/profile/notification-settings';
import type { NotificationKind } from '@/lib/api';

const KINDS: { kind: NotificationKind; title: string; hint: string }[] = [
  { kind: 'messages', title: 'Meddelanden', hint: 'När någon skriver till dig.' },
  {
    kind: 'friend_requests',
    title: 'Kompisförfrågningar',
    hint: 'När någon vill bli kompis med dig.',
  },
  { kind: 'meets', title: 'Meets', hint: 'När någon vill med på din meet.' },
];

export function NotificationSection() {
  const { data, isPending, isError, refetch } = useNotificationSettings();
  const setSetting = useSetNotificationSetting();

  if (isError && !data) {
    return (
      <SettingsGroup>
        <View style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
            Aviseringarna gick inte att ladda.
          </ThemedText>
          <Button label={Common.retry} size="sm" variant="secondary" onPress={() => refetch()} />
        </View>
      </SettingsGroup>
    );
  }

  return (
    <SettingsGroup>
      {KINDS.map(({ kind, title, hint }) => (
        <SwitchRow
          key={kind}
          testID={`notify-${kind}`}
          title={title}
          hint={hint}
          loading={isPending}
          value={data?.[kind] ?? true}
          onValueChange={(enabled) => setSetting.mutate({ kind, enabled })}
        />
      ))}
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  text: { flex: 1 },
});
