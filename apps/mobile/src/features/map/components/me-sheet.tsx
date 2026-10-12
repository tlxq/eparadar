import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Profile } from '@/lib/api';
import type { DbRow } from '@/lib/db-types';
import { useSharingToggle } from '@/features/map/use-sharing-toggle';
import { showToast } from '@/store/toast';

type MeSheetProps = {
  visible: boolean;
  profile: Profile | null | undefined;
  location: DbRow<'locations'> | null | undefined;
  onClose: () => void;
  onStatus: () => void;
};

export function MeSheet({ visible, profile, location, onClose, onStatus }: MeSheetProps) {
  const { setSharing, busy } = useSharingToggle();
  const ghost = !location?.sharing_enabled;

  async function toggleGhost() {
    const error = await setSharing(ghost);
    showToast(
      error
        ? { tone: 'error', message: error }
        : {
            tone: 'success',
            message: ghost ? 'Du syns igen för dina kompisar!' : 'Spökläge på! Ingen ser dig nu.',
          },
    );
  }

  const sharingText = !location?.sharing_enabled
    ? 'Spökläge är på. Ingen av dina kompisar ser dig på kartan.'
    : location.approximate_enabled
      ? 'Dina kompisar ser ungefär var du är, inte exakt punkt.'
      : 'Dina kompisar ser din exakta plats och när du kör.';

  const actions: SheetAction[] = [
    {
      label: ghost ? 'Stäng av spökläge' : 'Slå på spökläge',
      icon: ghost ? 'eye-outline' : 'eye-off-outline',
      hint: ghost ? 'Kompisarna ser dig på kartan igen' : 'Kompisarna slutar se dig direkt',
      disabled: busy,
      onPress: toggleGhost,
    },
    {
      label: location?.status_text ? 'Ändra status' : 'Sätt status',
      icon: 'chatbubble-ellipses-outline',
      hint: 'Syns för kompisar i en timme',
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
            <ThemedText type="smallBold">Så ser kompisarna dig</ThemedText>
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
