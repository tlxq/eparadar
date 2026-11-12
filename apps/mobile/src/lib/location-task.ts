import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { Common } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { motionFromCoords } from '@/features/map/motion';
import { upsertLocation } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';

const LOCATION_TASK_NAME = 'eparadar-background-location';

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
    await upsertLocation({
      userId,
      lat: latest.coords.latitude,
      lng: latest.coords.longitude,
      ...motionFromCoords(latest.coords),
    });
  } catch (err) {
    console.error('[location-task] upsert failed', err);
  }
});

type LocationPermission =
  | { granted: true; background: boolean }
  | { granted: false; reason: string; blocked: boolean; cancelled: boolean };

const EXPLAINER = {
  title: 'Dela din plats?',
  message:
    'Dina kompisar ser var du är på kartan medan du kör. Ingen annan ser dig. Du stänger av det när du vill med spökläge.',
  confirmLabel: 'Fortsätt',
  cancelLabel: Common.cancel,
  icon: 'location-outline',
} as const;

const BACKGROUND_EXPLAINER = {
  title: 'Dela även när appen är stängd?',
  message:
    'Då ser dina kompisar var du är även när epaRadar ligger i bakgrunden. Välj "Tillåt alltid" på nästa skärm. Spökläge stänger av det.',
  confirmLabel: 'Fortsätt',
  cancelLabel: 'Inte nu',
  icon: 'navigate-outline',
} as const;

function denied(blocked: boolean): LocationPermission {
  return {
    granted: false,
    blocked,
    cancelled: false,
    reason: blocked
      ? 'Platsen är blockerad för epaRadar. Tillåt den i telefonens inställningar så kan du synas. Spökläget är kvar på.'
      : 'Du behöver tillåta plats för att synas. Spökläget är kvar på.',
  };
}

export async function requestLocationPermissions(): Promise<LocationPermission> {
  let foreground = await Location.getForegroundPermissionsAsync();
  let fresh = false;
  if (foreground.status !== 'granted') {
    if (!foreground.canAskAgain) return denied(true);
    const understood = await confirm(EXPLAINER);
    if (!understood) {
      return {
        granted: false,
        blocked: false,
        cancelled: true,
        reason: 'Okej, spökläget är kvar på.',
      };
    }
    foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') return denied(!foreground.canAskAgain);
    fresh = true;
  }
  let background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== 'granted' && fresh && background.canAskAgain) {
    if (await confirm(BACKGROUND_EXPLAINER)) {
      background = await Location.requestBackgroundPermissionsAsync();
    }
  }
  return { granted: true, background: background.status === 'granted' };
}

export async function startLocationSharing(): Promise<void> {
  const background = await Location.getBackgroundPermissionsAsync();
  if (background.status !== 'granted') return;
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
        'Dina kompisar kan se var du är just nu. Stäng av i Inställningar när du vill.',
      notificationColor: Colors.dark.brand,
    },
  });
}

export async function stopLocationSharing(): Promise<void> {
  const started = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}

export async function stopLocationSharingQuietly(): Promise<void> {
  try {
    await stopLocationSharing();
  } catch {
    return;
  }
}
