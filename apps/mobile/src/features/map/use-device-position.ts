import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useIsFocused } from 'expo-router/react-navigation';

import { motionFromCoords } from '@/features/map/motion';

type LocationAccess = 'checking' | 'granted' | 'ask' | 'blocked' | 'off';

async function readLocationAccess(): Promise<LocationAccess> {
  const [permission, servicesOn] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.hasServicesEnabledAsync(),
  ]);
  if (permission.status !== 'granted') return permission.canAskAgain ? 'ask' : 'blocked';
  return servicesOn ? 'granted' : 'off';
}

export async function fixLocationAccess(access: LocationAccess): Promise<boolean> {
  if (access === 'ask') {
    await Location.requestForegroundPermissionsAsync();
  } else if (access === 'off' && Platform.OS === 'android') {
    await Location.enableNetworkProviderAsync().catch(() => undefined);
  } else {
    await Linking.openSettings();
    return false;
  }
  return (await readLocationAccess().catch(() => 'checking')) === 'granted';
}

export function useDevicePosition() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [motion, setMotion] = useState<{ moving: boolean; heading: number | null }>({
    moving: false,
    heading: null,
  });
  const [access, setAccess] = useState<LocationAccess>('checking');
  const [attempt, setAttempt] = useState(0);

  const recheck = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') recheck();
    });
    return () => sub.remove();
  }, [recheck]);

  const focused = useIsFocused();

  useEffect(() => {
    if (!focused) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    readLocationAccess()
      .then((next) => {
        if (cancelled) return null;
        setAccess(next);
        if (next !== 'granted') return null;
        return Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 1000 },
          (update) => {
            setPosition({ lat: update.coords.latitude, lng: update.coords.longitude });
            setMotion(motionFromCoords(update.coords));
          },
        );
      })
      .then((sub) => {
        if (!sub) return;
        if (cancelled) sub.remove();
        else subscription = sub;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [focused, attempt]);

  return { position, motion, access, recheck };
}
