import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { deleteSpotPhoto, fetchSpotPhotos, type SpotPhoto } from '@/features/map/spots';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showToast, showUndoToast } from '@/store/toast';
import { SIGNED_URL_REFRESH_MS } from '@/lib/queryClient';

const THUMB_W = 132;
const THUMB_H = 99;

type SpotPhotoStripProps = {
  spotId: string;
  userId: string;
  spotCreatorId: string;
};

export function SpotPhotoStrip({ spotId, userId, spotCreatorId }: SpotPhotoStripProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data: photos, isLoading } = useQuery({
    queryKey: queryKeys.spotPhotos(spotId),
    queryFn: () => fetchSpotPhotos(spotId),
    refetchInterval: SIGNED_URL_REFRESH_MS,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotos(spotId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotoCounts() });
  }

  function handleRemove(photo: SpotPhoto) {
    queryClient.setQueryData<SpotPhoto[]>(queryKeys.spotPhotos(spotId), (current) =>
      current?.filter((item) => item.id !== photo.id),
    );
    showUndoToast({
      message: 'Bilden är borttagen.',
      onUndo: refresh,
      onCommit: async () => {
        try {
          await deleteSpotPhoto(photo);
        } catch (error) {
          showToast({ tone: 'error', message: getErrorMessage(error) });
        }
        refresh();
      },
    });
  }

  if (isLoading) {
    return (
      <View style={styles.row}>
        <Skeleton width={THUMB_W} height={THUMB_H} radius={Radius.md} />
        <Skeleton width={THUMB_W} height={THUMB_H} radius={Radius.md} />
      </View>
    );
  }

  if (!photos?.length) {
    return (
      <ThemedText type="caption" themeColor="textSecondary">
        Inga bilder ännu. Lägg upp en på kärran här, den syns i 24 timmar.
      </ThemedText>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {photos.map((photo) => {
        const canRemove = photo.author_id === userId || spotCreatorId === userId;
        return (
          <Pressable
            key={photo.id}
            accessibilityRole="image"
            accessibilityLabel="Bild från spotten"
            accessibilityHint={canRemove ? 'Håll in för att ta bort' : undefined}
            onLongPress={canRemove ? () => handleRemove(photo) : undefined}
            style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}
          >
            {photo.url ? (
              <Image
                source={{ uri: photo.url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two },
  thumb: { width: THUMB_W, height: THUMB_H, borderRadius: Radius.md, overflow: 'hidden' },
});
