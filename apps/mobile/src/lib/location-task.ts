import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { Colors } from '@/constants/theme';
import { upsertLocation } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export const LOCATION_TASK_NAME = 'eparadar-background-location';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[location-task]', error.message);
    return;
  }
  const { locations } = (data as { locations?: Location.LocationObject[] }) ?? {};
  const latest = locations?.[locations.length - 1];
  if (!latest) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;

  try {
    await upsertLocation({ userId, lat: latest.coords.latitude, lng: latest.coords.longitude });
  } catch (err) {
    console.error('[location-task] upsert failed', err);
  }
});

export type PermissionResult = { granted: true } | { granted: false; reason: string };

export async function requestLocationPermissions(): Promise<PermissionResult> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    return {
      granted: false,
      reason: 'epaRadar behöver åtkomst till din plats för att kunna visa dig på kartan.',
    };
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') {
    return {
      granted: false,
      reason:
        'epaRadar behöver bakgrundsåtkomst till din plats för att dela den med dina vänner även när appen är stängd. Öppna telefonens inställningar och välj "Tillåt alltid" för epaRadar.',
    };
  }
  return { granted: true };
}

export async function startLocationSharing(): Promise<void> {
  const alreadyStarted = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (alreadyStarted) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000,
    distanceInterval: 50,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'epaRadar delar din plats',
      notificationBody:
        'Dina vänner kan se var du är just nu. Stäng av i Inställningar när du vill.',
      notificationColor: Colors.dark.brand,
    },
  });
}

export async function stopLocationSharing(): Promise<void> {
  const started = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}
