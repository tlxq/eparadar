import { useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { ModalHeader } from '@/components/modal-header';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { parseScannedFriendCode } from '@/features/friends/friend-code';
import { useTheme } from '@/hooks/use-theme';

const FRAME_SIZE = 240;
const CORNER = 44;
const DEFAULT_HINT = 'Rikta kameran mot kompisens kod';
const HINT_RESET_MS = 3000;

function Viewfinder() {
  const theme = useTheme();
  const cornerColor = { borderColor: theme.onScrim };
  return (
    <View style={styles.frame} pointerEvents="none">
      <View style={[styles.corner, styles.topLeft, cornerColor]} />
      <View style={[styles.corner, styles.topRight, cornerColor]} />
      <View style={[styles.corner, styles.bottomLeft, cornerColor]} />
      <View style={[styles.corner, styles.bottomRight, cornerColor]} />
    </View>
  );
}

export default function ScanFriendCodeScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [hint, setHint] = useState(DEFAULT_HINT);
  const handled = useRef(false);

  useEffect(() => {
    if (hint === DEFAULT_HINT) return;
    const timer = setTimeout(() => setHint(DEFAULT_HINT), HINT_RESET_MS);
    return () => clearTimeout(timer);
  }, [hint]);

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
          <ModalHeader title="Skanna kod" leading="close" />
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
              label="Skriv kod i stället"
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
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ModalHeader
          title="Skanna kod"
          leading="close"
          trailing={
            <IconButton
              icon={torch ? 'flash' : 'flash-outline'}
              accessibilityLabel={torch ? 'Stäng av lampan' : 'Tänd lampan'}
              onPress={() => setTorch((on) => !on)}
            />
          }
        />
        <View style={[styles.camera, { backgroundColor: theme.scrim }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />
          <SafeAreaView style={styles.overlay} edges={['bottom']}>
            <View
              style={[styles.hintPill, { backgroundColor: theme.scrimSurface }]}
              accessibilityLiveRegion="polite"
            >
              <ThemedText type="smallBold" style={{ color: theme.onScrim }}>
                {hint}
              </ThemedText>
            </View>
            <View style={styles.frameArea}>
              <Viewfinder />
            </View>
            <View style={styles.cameraFooter}>
              <Button
                label="Skriv kod i stället"
                icon="keypad-outline"
                variant="secondary"
                onPress={() => router.replace('/friends/enter-code')}
              />
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, paddingTop: Spacing.three },
  hintPill: {
    alignSelf: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  frameArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
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
  permissionBody: { flex: 1, justifyContent: 'center' },
  permissionFooter: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
