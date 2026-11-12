import * as Location from 'expo-location';

import { upsertLocation } from '@/lib/api';
import { requestLocationPermissions, startLocationSharing } from '@/lib/location-task';

type EnableResult =
  { ok: true } | { ok: false; reason: string; blocked: boolean; cancelled: boolean };

async function currentPosition() {
  const known = await Location.getLastKnownPositionAsync();
  if (known) return known;
  try {
    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    return null;
  }
}

export async function enableLocationSharing(userId: string): Promise<EnableResult> {
  const permission = await requestLocationPermissions();
  if (!permission.granted) {
    return {
      ok: false,
      reason: permission.reason,
      blocked: permission.blocked,
      cancelled: permission.cancelled,
    };
  }
  const position = await currentPosition();
  if (!position) {
    return {
      ok: false,
      reason: 'epaRadar kunde inte hitta en aktuell plats. Öppna kartan och försök igen.',
      blocked: false,
      cancelled: false,
    };
  }
  await upsertLocation({
    userId,
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    sharingEnabled: true,
  });
  if (permission.background) await startLocationSharing();
  return { ok: true };
}
