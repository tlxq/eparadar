import { useState } from 'react';
import { Image, Modal, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { Common } from '@/constants/strings';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ImagePreviewProps = {
  uri: string | null;
  onCancel: () => void;
  onSend: (caption: string) => void;
};

export function ImagePreview({ uri, onCancel, onSend }: ImagePreviewProps) {
  const theme = useTheme();
  const [caption, setCaption] = useState('');

  return (
    <Modal visible={!!uri} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: theme.scrim }]}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.top}>
            <IconButton icon="close" accessibilityLabel={Common.cancel} onPress={onCancel} />
          </View>
          <KeyboardAvoider style={styles.container}>
            <View style={styles.imageWrap}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.image}
                  resizeMode="contain"
                  accessibilityLabel="Bilden du ska skicka"
                />
              ) : null}
            </View>
            <View style={[styles.composer, { backgroundColor: theme.background }]}>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Skriv något till bilden…"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Bildtext"
                multiline
                maxLength={2000}
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundElement, color: theme.text },
                ]}
              />
              <IconButton
                icon="arrow-up"
                variant="brand"
                size={44}
                accessibilityLabel="Skicka"
                onPress={() => {
                  onSend(caption.trim());
                  setCaption('');
                }}
              />
            </View>
          </KeyboardAvoider>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', padding: Spacing.three },
  imageWrap: { flex: 1, paddingHorizontal: Spacing.three },
  image: { width: '100%', height: '100%' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    paddingTop: 11,
    paddingBottom: 11,
    ...Typography.input,
  },
});
