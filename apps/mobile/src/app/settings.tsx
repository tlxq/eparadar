import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenBackground } from '@/components/screen-background';
import { Switch } from '@/components/switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fetchMyLocation, setLocationSharing, upsertLocation } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import {
  requestLocationPermissions,
  startLocationSharing,
  stopLocationSharing,
} from '@/lib/location-task';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

export default function SettingsScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: location, refetch } = useQuery({
    queryKey: queryKeys.myLocation(userId),
    queryFn: () => fetchMyLocation(userId!),
    enabled: !!userId,
  });
  const sharingEnabled = location?.sharing_enabled ?? false;

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
    if (!userId) return;
    setError(null);
    setBusy(true);
    try {
      if (value) {
        const permission = await requestLocationPermissions();
        if (!permission.granted) {
          setError(permission.reason);
          return;
        }
        const position = await Location.getLastKnownPositionAsync();
        if (!position) {
          setError('epaRadar kunde inte hitta en aktuell plats. Öppna kartan och försök igen.');
          return;
        }
        await upsertLocation({
          userId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          sharingEnabled: true,
        });
        await startLocationSharing();
      } else {
        await stopLocationSharing();
        await setLocationSharing(userId, false);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ThemedView type="backgroundElement" style={styles.row}>
          <View style={styles.rowText}>
            <ThemedText type="smallBold">Dela min plats</ThemedText>
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
        </ThemedView>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/privacy')}
        >
          <ThemedText type="small" themeColor="brand">
            Läs epaRadars integritetspolicy
          </ThemedText>
        </Pressable>
        {error ? <ThemedText type="error">{error}</ThemedText> : null}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowText: { flex: 1, gap: Spacing.half },
});
