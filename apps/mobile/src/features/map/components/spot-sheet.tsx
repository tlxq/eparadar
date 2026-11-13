import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { DetailSummary, type DetailRow } from '@/components/detail-summary';
import { Common, Words } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { SpotPhotoStrip } from '@/features/map/spot-photo-strip';
import { fetchProfile } from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';
import {
  addSpotPhoto,
  deleteSpot,
  distanceMeters,
  formatDistance,
  spotTitle,
  type Spot,
} from '@/features/map/spots';
import { useUserId } from '@/hooks/use-user-id';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { formatDisappearsAt } from '@/lib/relative-time';
import { pickImage, type ImageSource } from '@/lib/pick-image';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { openReport } from '@/store/report-sheet';
import { reportItem } from '@/features/moderation/use-moderation-items';
import { WarningVoteSection } from '@/features/map/warning-votes';

const REPORT_DELAY_MS = 250;

type SpotSheetProps = {
  spot: Spot | null;
  hereNow: number;
  myPosition: { lat: number; lng: number } | null;
  onClose: () => void;
};

export function SpotSheet({ spot, hereNow, myPosition, onClose }: SpotSheetProps) {
  const userId = useUserId();
  const theme = useTheme();
  const { data: creator } = useQuery({
    queryKey: queryKeys.profile(spot?.creator_id),
    queryFn: () => fetchProfile(spot!.creator_id),
    enabled: !!spot,
  });
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
    actions.push(reportItem({ type: 'spot', id: spot.id, userId: spot.creator_id, name: null }));
  }

  const rows: DetailRow[] = [];
  if (spot) {
    rows.push({ icon: 'time-outline', text: formatDisappearsAt(spot.expires_at) });
    if (spot.kind === 'ragg') {
      rows.push({
        icon: 'people-outline',
        text: hereNow > 0 ? `${hereNow} här nu` : 'Ingen här just nu',
        tone: hereNow > 0 ? 'success' : 'default',
      });
    }
    if (myPosition) {
      rows.push({
        icon: 'navigate-outline',
        text: `${formatDistance(distanceMeters(spot, myPosition))} från dig`,
      });
    }
    rows.push({ icon: 'eye-outline', text: 'Syns bara för kompisar' });
  }

  return (
    <ActionSheet
      visible={!!spot}
      header={
        spot ? (
          <View style={styles.header}>
            <DetailSummary
              title={spotTitle(spot)}
              kindLabel={spot.kind === 'ragg' ? Words.ragga : Words.warning}
              kindIcon={
                <Ionicons
                  name={spot.kind === 'ragg' ? 'sparkles-outline' : 'warning-outline'}
                  size={16}
                  color={theme.text}
                />
              }
              creator={
                creator
                  ? { id: creator.id, name: creator.display_name, avatarUrl: creator.avatar_url }
                  : null
              }
              isMine={spot.creator_id === userId}
              rows={rows}
            />
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
