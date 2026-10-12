import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { ThemedText } from '@/components/themed-text';
import { Common, Words } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { SpotPhotoStrip } from '@/features/map/spot-photo-strip';
import { addSpotPhoto, deleteSpot, spotTitle, type Spot } from '@/features/map/spots';
import { useUserId } from '@/hooks/use-user-id';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { formatTimeLeft } from '@/lib/relative-time';
import { pickImage, type ImageSource } from '@/lib/pick-image';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { openReport } from '@/store/report-sheet';
import { WarningVoteSection } from '@/features/map/warning-votes';

const REPORT_DELAY_MS = 250;

type SpotSheetProps = {
  spot: Spot | null;
  hereNow: number;
  onClose: () => void;
};

export function SpotSheet({ spot, hereNow, onClose }: SpotSheetProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  async function handleAddPhoto(spotId: string, source: ImageSource) {
    if (!userId) return;
    const uri = await pickImage({ aspect: [4, 3], quality: 0.7, source });
    if (!uri) return;
    setUploading(true);
    try {
      await addSpotPhoto(spotId, userId, uri);
      queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotos(spotId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotoCounts() });
      showToast({ tone: 'success', message: 'Bilden ligger på spotten i 24 timmar!' });
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
    actions.push(
      {
        label: uploading ? 'Laddar upp bild …' : 'Ta bild',
        icon: 'camera-outline',
        disabled: uploading,
        hint: 'Syns i 24 timmar',
        onPress: () => handleAddPhoto(spot.id, 'camera'),
      },
      {
        label: 'Välj från bilder',
        icon: 'image-outline',
        disabled: uploading,
        onPress: () => handleAddPhoto(spot.id, 'library'),
      },
    );
  }
  if (spot && spot.creator_id === userId) {
    actions.push({
      label: 'Ta bort spot',
      icon: 'trash-outline',
      destructive: true,
      onPress: () => handleDelete(spot.id),
    });
  } else if (spot) {
    actions.push({
      label: Common.report,
      icon: 'flag-outline',
      onPress: () => openReport({ type: 'spot', id: spot.id, userId: spot.creator_id, name: null }),
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
              {[
                spot.kind === 'ragg'
                  ? hereNow > 0
                    ? `${hereNow} här nu`
                    : 'Ingen här just nu'
                  : Words.warning,
                'syns för kompisar',
              ].join(' · ')}
            </ThemedText>
            {spot.creator_id === userId ? (
              <ThemedText type="smallBold" themeColor="textSecondary">
                {formatTimeLeft(spot.expires_at)}
              </ThemedText>
            ) : null}
            {spot.kind === 'ragg' && userId ? (
              <SpotPhotoStrip
                spotId={spot.id}
                userId={userId}
                spotCreatorId={spot.creator_id}
                onReport={(photo) => {
                  onClose();
                  setTimeout(
                    () =>
                      openReport({
                        type: 'spot_photo',
                        id: photo.id,
                        userId: photo.author_id,
                        name: null,
                      }),
                    REPORT_DELAY_MS,
                  );
                }}
              />
            ) : null}
            {spot.kind === 'varning' && userId ? <WarningVoteSection spotId={spot.id} /> : null}
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
