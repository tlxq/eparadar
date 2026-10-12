import { Image, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ImageViewer({
  uri,
  label = 'Bild',
  onClose,
}: {
  uri: string | null;
  label?: string;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: theme.scrim }]}>
        {uri ? (
          <Image
            source={{ uri }}
            resizeMode="contain"
            accessibilityLabel={label}
            style={styles.image}
          />
        ) : null}
        <SafeAreaView style={styles.close} edges={['top']} pointerEvents="box-none">
          <IconButton icon="close" accessibilityLabel="Stäng bilden" onPress={onClose} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  close: { position: 'absolute', top: 0, right: Spacing.three },
});
