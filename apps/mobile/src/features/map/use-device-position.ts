import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';

import { motionFromCoords } from '@/features/map/motion';

export function useDevicePosition() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [motion, setMotion] = useState<{ moving: boolean; heading: number | null }>({
    moving: false,
    heading: null,
  });

  useFocusEffect(
    useCallback(() => {
      let subscription: Location.LocationSubscription | null = null;
      let cancelled = false;
      Location.getForegroundPermissionsAsync()
        .then(({ status }) => {
          if (status !== 'granted' || cancelled) return null;
          return Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 1000 },
            (next) => {
              setPosition({ lat: next.coords.latitude, lng: next.coords.longitude });
              setMotion(motionFromCoords(next.coords));
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
    }, []),
  );

  return { position, motion };
}
