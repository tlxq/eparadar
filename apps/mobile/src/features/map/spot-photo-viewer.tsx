import { useState } from 'react';
import { Image } from 'expo-image';
import { FlatList, Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import type { SpotPhoto } from '@/features/map/spots';
import { useTheme } from '@/hooks/use-theme';

type SpotPhotoViewerProps = {
  photos: SpotPhoto[];
  startIndex: number;
  userId: string;
  spotCreatorId: string;
  onClose: () => void;
  onRemove: (photo: SpotPhoto) => void;
  onReport: (photo: SpotPhoto) => void;
};

export function SpotPhotoViewer({
  photos,
  startIndex,
  userId,
  spotCreatorId,
  onClose,
  onRemove,
  onReport,
}: SpotPhotoViewerProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, photos.length - 1)));
  const current = photos[Math.min(index, photos.length - 1)];
  const canRemove = !!current && (current.author_id === userId || spotCreatorId === userId);
  const canReport = !!current && current.author_id !== userId;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: theme.scrim }]}>
        <FlatList
          data={photos}
          keyExtractor={(photo) => photo.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item }) => (
            <View
              style={{ width }}
              accessibilityRole="image"
              accessibilityLabel="Bild från spotten"
            >
              {item.url ? (
                <Image source={{ uri: item.url }} style={styles.image} contentFit="contain" />
              ) : null}
            </View>
          )}
        />
        <SafeAreaView style={styles.top} edges={['top']}>
          <View style={styles.bar}>
            <IconButton icon="close" accessibilityLabel={Common.close} onPress={onClose} />
            {photos.length > 1 ? (
              <View style={[styles.counter, { backgroundColor: theme.scrimSurface }]}>
                <ThemedText type="smallBold" style={{ color: theme.onScrim }}>
                  {`${index + 1} / ${photos.length}`}
                </ThemedText>
              </View>
            ) : null}
            <View style={styles.actions}>
              {canReport ? (
                <IconButton
                  icon="flag-outline"
                  accessibilityLabel={`${Common.report} bilden`}
                  onPress={() => onReport(current)}
                />
              ) : null}
              {canRemove ? (
                <IconButton
                  icon="trash-outline"
                  accessibilityLabel={`${Common.remove} bilden`}
                  onPress={() => onRemove(current)}
                />
              ) : null}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  image: { width: '100%', height: '100%' },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  counter: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  actions: { flexDirection: 'row', gap: Spacing.two, minWidth: 40, justifyContent: 'flex-end' },
});
