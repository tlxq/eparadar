import * as Location from 'expo-location';

import { upsertLocation } from '@/lib/api';
import { requestLocationPermissions, startLocationSharing } from '@/lib/location-task';

export async function enableLocationSharing(
  userId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const permission = await requestLocationPermissions();
  if (!permission.granted) return { ok: false, reason: permission.reason };
  const position = await Location.getLastKnownPositionAsync();
  if (!position) {
    return {
      ok: false,
      reason: 'epaRadar kunde inte hitta en aktuell plats. Öppna kartan och försök igen.',
    };
  }
  await upsertLocation({
    userId,
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    sharingEnabled: true,
  });
  await startLocationSharing();
  return { ok: true };
}
