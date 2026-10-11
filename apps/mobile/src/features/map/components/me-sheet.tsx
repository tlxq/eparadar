import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Profile } from '@/lib/api';
import type { DbRow } from '@/lib/db-types';

type MeSheetProps = {
  visible: boolean;
  profile: Profile | null | undefined;
  location: DbRow<'locations'> | null | undefined;
  onClose: () => void;
  onStatus: () => void;
};

export function MeSheet({ visible, profile, location, onClose, onStatus }: MeSheetProps) {
  const sharingText = !location?.sharing_enabled
    ? 'Spökläge är på. Ingen av dina vänner ser dig på kartan.'
    : location.approximate_enabled
      ? 'Dina vänner ser ungefär var du är, inte exakt punkt.'
      : 'Dina vänner ser din exakta plats och när du kör.';

  const actions: SheetAction[] = [
    {
      label: location?.status_text ? 'Ändra status' : 'Sätt status',
      icon: 'chatbubble-ellipses-outline',
      hint: 'Syns för vänner i en timme',
      onPress: onStatus,
    },
    {
      label: 'Ändra vad jag delar',
      icon: 'options-outline',
      onPress: () => router.push('/settings'),
    },
    {
      label: 'Min profil',
      icon: 'person-circle-outline',
      onPress: () => router.push('/(tabs)/profile'),
    },
  ];

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      header={
        <View style={styles.header}>
          <Avatar name={profile?.display_name ?? ''} imageUrl={profile?.avatar_url} size={56} />
          <View style={styles.text}>
            <ThemedText type="smallBold">Så ser vännerna dig</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {sharingText}
            </ThemedText>
          </View>
        </View>
      }
      actions={actions}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  text: { flex: 1, gap: Spacing.one },
});
