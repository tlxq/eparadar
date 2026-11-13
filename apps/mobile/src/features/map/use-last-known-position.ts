import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export function useLastKnownPosition(): { lat: number; lng: number } | null {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;
      const last = await Location.getLastKnownPositionAsync();
      if (active && last) setPosition({ lat: last.coords.latitude, lng: last.coords.longitude });
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return position;
}
