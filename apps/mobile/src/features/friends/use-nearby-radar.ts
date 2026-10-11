import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { leaveNearby, scanNearby } from '@/features/friends/nearby';
import { queryKeys } from '@/lib/query-keys';

const SCAN_INTERVAL_MS = 5000;

export type RadarPermission = 'checking' | 'undetermined' | 'granted' | 'denied' | 'blocked';

function toRadarPermission(response: Location.LocationPermissionResponse): RadarPermission {
  if (response.granted) return 'granted';
  if (response.status === Location.PermissionStatus.UNDETERMINED) return 'undetermined';
  return response.canAskAgain ? 'denied' : 'blocked';
}

export function useNearbyRadar(userId: string | undefined) {
  const [permission, setPermission] = useState<RadarPermission>('checking');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [active, setActive] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then((response) =>
      setPermission(toRadarPermission(response)),
    );
  }, []);

  const requestPermission = useCallback(async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    setPermission(toRadarPermission(response));
  }, []);

  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => {
        setActive(false);
        leaveNearby().catch(() => undefined);
      };
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const foreground = state === 'active';
      setActive(foreground);
      if (!foreground && !leaving.current) {
        leaving.current = true;
        leaveNearby()
          .catch(() => undefined)
          .finally(() => {
            leaving.current = false;
          });
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (permission !== 'granted' || !active) return;
    let watcher: Location.LocationSubscription | null = null;
    let cancelled = false;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: SCAN_INTERVAL_MS, distanceInterval: 5 },
      (position) => setCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
    ).then((subscription) => {
      if (cancelled) subscription.remove();
      else watcher = subscription;
    });
    return () => {
      cancelled = true;
      watcher?.remove();
    };
  }, [permission, active]);

  const query = useQuery({
    queryKey: queryKeys.nearby(userId, coords?.lat.toFixed(4), coords?.lng.toFixed(4)),
    queryFn: () => scanNearby(coords!.lat, coords!.lng),
    enabled: !!userId && !!coords && active && permission === 'granted',
    refetchInterval: SCAN_INTERVAL_MS,
    placeholderData: (previous) => previous,
    gcTime: 0,
  });

  return {
    permission,
    requestPermission,
    locating: permission === 'granted' && !coords,
    people: query.data ?? [],
    isError: query.isError,
    refetch: query.refetch,
  };
}
