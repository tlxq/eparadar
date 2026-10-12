import { Modal, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const CLOSE_DRAG = 140;

function reset(...values: SharedValue<number>[]) {
  'worklet';
  values.forEach((value, index) => {
    value.value = withTiming(index === 0 ? 1 : 0);
  });
}

function ZoomableImage({
  uri,
  label,
  onClose,
}: {
  uri: string;
  label: string;
  onClose: () => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(0.8, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        reset(scale, x, y);
        savedScale.value = 1;
        savedX.value = 0;
        savedY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      x.value = savedX.value + e.translationX;
      y.value = savedY.value + e.translationY;
    })
    .onEnd((e) => {
      if (savedScale.value <= 1) {
        if (Math.abs(e.translationY) > CLOSE_DRAG) {
          scheduleOnRN(onClose);
          return;
        }
        x.value = withTiming(0);
        y.value = withTiming(0);
        return;
      }
      savedX.value = x.value;
      savedY.value = y.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        reset(scale, x, y);
        savedScale.value = 1;
        savedX.value = 0;
        savedY.value = 0;
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.Image
        source={{ uri }}
        resizeMode="contain"
        accessibilityLabel={label}
        accessibilityHint="Nyp för att zooma. Dra nedåt för att stänga."
        style={[styles.image, style]}
      />
    </GestureDetector>
  );
}

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
      <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.scrim }]}>
        {uri ? <ZoomableImage uri={uri} label={label} onClose={onClose} /> : null}
        <SafeAreaView style={styles.close} edges={['top']} pointerEvents="box-none">
          <IconButton icon="close" accessibilityLabel="Stäng bilden" onPress={onClose} />
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  close: { position: 'absolute', top: 0, right: Spacing.three },
});
