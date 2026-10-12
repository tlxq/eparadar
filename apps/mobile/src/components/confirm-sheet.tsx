import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useConfirmStore } from '@/store/confirm';

export function ConfirmSheetHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const request = useConfirmStore((state) => state.request);
  const answer = useConfirmStore((state) => state.answer);

  const tone = request?.destructive ? theme.danger : theme.brandOnSurface;
  const icon = request?.icon ?? (request?.destructive ? 'trash-outline' : 'help-circle-outline');

  return (
    <Modal
      visible={!!request}
      transparent
      animationType="fade"
      onRequestClose={() => answer(false)}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={request?.cancelLabel ?? Common.cancel}
        style={styles.backdrop}
        onPress={() => answer(false)}
      />
      {request ? (
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundElement,
              paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.two,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.backgroundSelected }]} />
          <View style={[styles.iconTile, { backgroundColor: `${tone}24` }]}>
            <Ionicons name={icon} size={26} color={tone} />
          </View>
          <ThemedText type="subtitle" accessibilityRole="header" style={styles.center}>
            {request.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {request.message}
          </ThemedText>
          <View style={styles.buttons}>
            <Button
              label={request.confirmLabel}
              tone={request.destructive ? 'danger' : 'brand'}
              onPress={() => answer(true)}
            />
            <Button
              label={request.cancelLabel ?? Common.cancel}
              variant="ghost"
              onPress={() => answer(false)}
            />
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    alignItems: 'stretch',
  },
  handle: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: Spacing.two },
  iconTile: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  center: { textAlign: 'center' },
  buttons: { gap: Spacing.one, marginTop: Spacing.three },
});
