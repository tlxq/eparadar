import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { SpotPhotoStrip } from '@/features/map/spot-photo-strip';
import { addSpotPhoto, deleteSpot, spotTitle, type Spot } from '@/features/map/spots';
import { useUserId } from '@/hooks/use-user-id';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { pickImage } from '@/lib/pick-image';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

type SpotSheetProps = {
  spot: Spot | null;
  hereNow: number;
  onClose: () => void;
};

export function SpotSheet({ spot, hereNow, onClose }: SpotSheetProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  async function handleAddPhoto(spotId: string) {
    if (!userId) return;
    const uri = await pickImage({ aspect: [4, 3], quality: 0.7 });
    if (!uri) return;
    setUploading(true);
    try {
      await addSpotPhoto(spotId, userId, uri);
      queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotos(spotId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotoCounts() });
      showToast({ tone: 'success', message: 'Bilden ligger på spotten i 24 timmar.' });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(spotId: string) {
    const ok = await confirmDestructive({
      title: 'Ta bort spotten?',
      message: 'Den försvinner från kartan för alla.',
      confirmLabel: Common.remove,
    });
    if (!ok) return;
    try {
      await deleteSpot(spotId);
      queryClient.invalidateQueries({ queryKey: queryKeys.spots() });
      showToast({ message: 'Spotten är borttagen.' });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  const actions: SheetAction[] = [];
  if (spot?.kind === 'ragg') {
    actions.push({
      label: uploading ? 'Laddar upp bild …' : 'Lägg till bild',
      icon: 'image-outline',
      disabled: uploading,
      hint: 'Syns i 24 timmar',
      onPress: () => handleAddPhoto(spot.id),
    });
  }
  if (spot && spot.creator_id === userId) {
    actions.push({
      label: 'Ta bort spot',
      icon: 'trash-outline',
      destructive: true,
      onPress: () => handleDelete(spot.id),
    });
  }

  return (
    <ActionSheet
      visible={!!spot}
      title={spot ? spotTitle(spot) : undefined}
      header={
        spot ? (
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              {spot.kind === 'ragg'
                ? hereNow > 0
                  ? `${hereNow} här nu`
                  : 'Ingen här just nu'
                : 'Varning · försvinner av sig själv efter 2 timmar'}
              {spot.visibility === 'all' ? ' · syns för alla' : ' · syns för vänner'}
            </ThemedText>
            {spot.kind === 'ragg' && userId ? (
              <SpotPhotoStrip spotId={spot.id} userId={userId} spotCreatorId={spot.creator_id} />
            ) : null}
          </View>
        ) : null
      }
      onClose={onClose}
      actions={actions}
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.three },
});
