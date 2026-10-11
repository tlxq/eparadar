import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { ScreenBackground } from '@/components/screen-background';
import { Switch } from '@/components/switch';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setLocationApproximate, setLocationSharing, signOut } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { stopLocationSharing, stopLocationSharingQuietly } from '@/lib/location-task';
import { queryKeys } from '@/lib/query-keys';
import { useMyLocation } from '@/features/map/hooks';
import { BlockedSection } from '@/features/friends/components/blocked-section';
import { useSharingToggle } from '@/features/map/use-sharing-toggle';
import { useUserId } from '@/hooks/use-user-id';

export default function SettingsScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const { setSharing, busy } = useSharingToggle();
  const [error, setError] = useState<string | null>(null);

  const { data: location, refetch } = useMyLocation();
  const sharingEnabled = location?.sharing_enabled ?? false;
  const approximateEnabled = location?.approximate_enabled ?? false;
  const [approximateBusy, setApproximateBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId || !sharingEnabled) return;
      Location.getBackgroundPermissionsAsync().then(async (permission) => {
        if (permission.status !== 'granted') {
          await stopLocationSharing();
          await setLocationSharing(userId, false);
          setError(
            'Platsåtkomst har inaktiverats i telefonens inställningar. Platsdelning är nu avstängd.',
          );
          refetch();
        }
      });
    }, [userId, sharingEnabled, refetch]),
  );

  async function handleToggle(value: boolean) {
    setError(null);
    setError(await setSharing(value));
  }

  async function handleApproximateToggle(value: boolean) {
    if (!userId) return;
    setError(null);
    setApproximateBusy(true);
    try {
      await setLocationApproximate(userId, value);
      queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setApproximateBusy(false);
    }
  }

  async function handleSignOut() {
    const ok = await confirmDestructive({
      title: 'Logga ut?',
      message: 'Du kan logga in igen när du vill.',
      confirmLabel: 'Logga ut',
    });
    if (!ok) return;
    await stopLocationSharingQuietly();
    await signOut();
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
            PLATS
          </ThemedText>
          <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText type="headline">Dela min plats</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  När det här är på kan dina vänner se var du är på kartan. Ingen annan kan se din
                  plats, den delas aldrig offentligt, och du kan stänga av det här när du vill.
                </ThemedText>
              </View>
              <Switch
                testID="sharing-toggle"
                value={sharingEnabled}
                onValueChange={handleToggle}
                disabled={busy}
              />
            </View>
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <View style={[styles.row, !sharingEnabled && styles.rowDisabled]}>
              <View style={styles.rowText}>
                <ThemedText type="headline">Ungefärlig plats</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Visa bara ett ungefärligt område för dina vänner — cirka 300 meter — istället för
                  exakt var du står. Bra när du vill dela att du är i närheten utan att visa exakt
                  position.
                </ThemedText>
              </View>
              <Switch
                testID="approximate-toggle"
                value={approximateEnabled}
                onValueChange={handleApproximateToggle}
                disabled={!sharingEnabled || approximateBusy}
              />
            </View>
          </View>
          {error ? <ThemedText type="error">{error}</ThemedText> : null}

          <BlockedSection />

          <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
            OM EPARADAR
          </ThemedText>
          <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/privacy')}
              style={({ pressed }) => [
                styles.linkRow,
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color={theme.brandOnSurface} />
              <ThemedText type="headline" style={styles.rowText}>
                Integritetspolicy
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ThemedText type="caption" themeColor="textSecondary" style={styles.sectionLabel}>
            KONTO
          </ThemedText>
          <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
            <Pressable
              accessibilityRole="button"
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.linkRow,
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <Ionicons name="log-out-outline" size={22} color={theme.danger} />
              <ThemedText type="headline" themeColor="danger" style={styles.rowText}>
                Logga ut
              </ThemedText>
            </Pressable>
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push('/delete-account')}
              style={({ pressed }) => [
                styles.linkRow,
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <Ionicons name="trash-outline" size={22} color={theme.danger} />
              <ThemedText type="headline" themeColor="danger" style={styles.rowText}>
                Radera konto
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  sectionLabel: { letterSpacing: 0.6, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  group: { borderRadius: Radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  rowText: { flex: 1, gap: Spacing.half },
  rowDisabled: { opacity: 0.55 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
});
