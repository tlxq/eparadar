import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { distanceMeters } from '@/features/map/spots';

const NEARBY_WARNING_METERS = 300;

const SEEN_KEY = 'eparadar.map.warningsSeen';
const AHEAD_DEGREES = 60;

type LatLng = { lat: number; lng: number };

type WarningSpot = LatLng & {
  id: string;
  kind: string;
  title: string;
  mine: boolean;
  expiresAt: number;
};

export type NearbyWarning = { id: string; title: string; meters: number; ahead: boolean };

function bearingDegrees(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function roundedDistance(meters: number): number {
  return Math.max(50, Math.round(meters / 50) * 50);
}

export function findNearbyWarning(
  position: LatLng,
  heading: number | null,
  moving: boolean,
  spots: WarningSpot[],
  seen: Set<string>,
  now = Date.now(),
): NearbyWarning | null {
  let best: NearbyWarning | null = null;
  for (const spot of spots) {
    if (spot.kind !== 'varning' || spot.mine || seen.has(spot.id) || spot.expiresAt <= now) {
      continue;
    }
    const meters = distanceMeters(position, spot);
    if (meters > NEARBY_WARNING_METERS || (best && meters >= best.meters)) continue;
    const diff =
      heading == null
        ? 180
        : Math.abs(((bearingDegrees(position, spot) - heading + 540) % 360) - 180);
    best = { id: spot.id, title: spot.title, meters, ahead: moving && diff <= AHEAD_DEGREES };
  }
  return best;
}

export function useNearbyWarning({
  position,
  heading,
  moving,
  spots,
  enabled,
}: {
  position: LatLng | null;
  heading: number | null;
  moving: boolean;
  spots: WarningSpot[];
  enabled: boolean;
}) {
  const seen = useRef<Map<string, number> | null>(null);
  const [warning, setWarning] = useState<NearbyWarning | null>(null);

  useEffect(() => {
    if (seen.current) return;
    AsyncStorage.getItem(SEEN_KEY)
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : {};
        const now = Date.now();
        const entries =
          parsed && typeof parsed === 'object'
            ? Object.entries(parsed as Record<string, number>).filter(
                ([, expiresAt]) => typeof expiresAt === 'number' && expiresAt > now,
              )
            : [];
        seen.current = new Map([...entries, ...(seen.current ?? new Map())]);
      })
      .catch(() => {
        seen.current = seen.current ?? new Map();
      });
  }, []);

  useEffect(() => {
    if (!enabled || !position || warning || !seen.current) return;
    const found = findNearbyWarning(position, heading, moving, spots, new Set(seen.current.keys()));
    if (!found) return;
    const spot = spots.find((item) => item.id === found.id);
    seen.current.set(found.id, spot?.expiresAt ?? Date.now());
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(seen.current))).catch(
      () => undefined,
    );
    setWarning(found);
  }, [enabled, position, heading, moving, spots, warning]);

  const dismiss = useCallback(() => setWarning(null), []);
  const live = warning && spots.some((spot) => spot.id === warning.id) ? warning : null;

  return { warning: live, dismiss };
}
