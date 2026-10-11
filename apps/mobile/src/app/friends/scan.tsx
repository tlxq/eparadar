import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { parseScannedFriendCode } from '@/features/friends/friend-code';
import { Common } from '@/constants/strings';

const FRAME_SIZE = 240;
const CORNER = 44;
const OVERLAY_TEXT = '#FFFFFF';
const OVERLAY_SURFACE = 'rgba(11, 14, 20, 0.72)';

function Viewfinder() {
  return (
    <View style={styles.frame} pointerEvents="none">
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
    </View>
  );
}

export default function ScanFriendCodeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [hint, setHint] = useState('Rikta kameran mot kompisens kod');
  const handled = useRef(false);

  function handleScan({ data }: BarcodeScanningResult) {
    if (handled.current) return;
    const code = parseScannedFriendCode(data);
    if (!code) {
      setHint('Det där är inte en epaRadar-kod');
      return;
    }
    handled.current = true;
    router.replace(`/add/${code}`);
  }

  if (!permission) {
    return <ScreenBackground style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <ScreenBackground style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.permissionNav}>
            <IconButton
              icon="close"
              accessibilityLabel={Common.close}
              onPress={() => router.back()}
            />
          </View>
          <View style={styles.permissionBody}>
            <EmptyState
              icon="camera-outline"
              title="Kameran behövs för att skanna"
              message="epaRadar använder bara kameran här, för att läsa kompisens kod. Inga bilder sparas."
              action={
                permission.canAskAgain
                  ? { label: 'Tillåt kameran', icon: 'camera', onPress: requestPermission }
                  : {
                      label: 'Öppna inställningar',
                      icon: 'settings-outline',
                      onPress: () => Linking.openSettings(),
                    }
              }
            />
          </View>
          <View style={styles.permissionFooter}>
            <Button
              label="Skriv in kod istället"
              icon="keypad-outline"
              variant="secondary"
              onPress={() => router.replace('/friends/enter-code')}
            />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <View style={styles.camera}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.cameraNav}>
          <IconButton
            icon="close"
            accessibilityLabel={Common.close}
            onPress={() => router.back()}
          />
          <ThemedText type="headline" style={styles.overlayText} accessibilityRole="header">
            Skanna kod
          </ThemedText>
          <IconButton
            icon={torch ? 'flash' : 'flash-outline'}
            accessibilityLabel={torch ? 'Stäng av lampan' : 'Tänd lampan'}
            onPress={() => setTorch((on) => !on)}
          />
        </View>
        <View style={styles.hintPill} accessibilityLiveRegion="polite">
          <ThemedText type="smallBold" style={styles.overlayText}>
            {hint}
          </ThemedText>
        </View>
        <View style={styles.frameArea}>
          <Viewfinder />
        </View>
        <View style={styles.cameraFooter}>
          <Button
            label="Skriv in kod istället"
            icon="keypad-outline"
            variant="secondary"
            onPress={() => router.replace('/friends/enter-code')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1, backgroundColor: '#000000' },
  overlay: { flex: 1 },
  overlayText: { color: OVERLAY_TEXT },
  cameraNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  hintPill: {
    alignSelf: 'center',
    backgroundColor: OVERLAY_SURFACE,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  frameArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: OVERLAY_TEXT },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: Radius.xl,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: Radius.xl,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: Radius.xl,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: Radius.xl,
  },
  cameraFooter: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  permissionNav: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  permissionBody: { flex: 1, justifyContent: 'center' },
  permissionFooter: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
