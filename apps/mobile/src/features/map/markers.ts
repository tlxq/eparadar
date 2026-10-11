import { carColorHex } from '@/features/map/car-colors';
import { meetupVibe, SPOT_ICONS, spotIconKey } from '@/features/map/map-icons';
import { countHereNow, spotTitle, type Spot } from '@/features/map/spots';
import type { Meetup } from '@/features/meetups/api';
import type { Car, FriendLocation, Profile } from '@/lib/api';
import type { DbRow } from '@/lib/db-types';

type LatLng = { lat: number; lng: number };
type Motion = { moving: boolean; heading: number | null };

export function latestCarColor(
  cars: Pick<Car, 'color' | 'created_at'>[] | undefined,
): string | null {
  return (
    [...(cars ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .find((car) => car.color)?.color ?? null
  );
}

export function friendMarkers(friends: FriendLocation[] | undefined) {
  return (friends ?? []).map((f) => ({
    id: f.user_id,
    lat: f.lat,
    lng: f.lng,
    label: f.profile.display_name,
    avatarUrl: f.profile.avatar_url,
    approximate: f.approximate_enabled,
    ring: carColorHex(latestCarColor(f.profile.cars)),
    heading: f.heading,
    moving: f.moving,
    updatedAt: new Date(f.updated_at).getTime(),
    status: f.status_text,
    statusExpiresAt: f.status_expires_at ? new Date(f.status_expires_at).getTime() : null,
  }));
}

export type FriendMarker = ReturnType<typeof friendMarkers>[number];

export function meMarker({
  devicePosition,
  motion,
  location,
  profile,
  cars,
}: {
  devicePosition: LatLng | null;
  motion: Motion;
  location: DbRow<'locations'> | null | undefined;
  profile: Profile | null | undefined;
  cars: Car[] | undefined;
}) {
  const position = devicePosition ?? (location ? { lat: location.lat, lng: location.lng } : null);
  if (!position || !profile) return null;
  const ghost = !location?.sharing_enabled;
  return {
    lat: position.lat,
    lng: position.lng,
    label: profile.display_name,
    avatarUrl: profile.avatar_url,
    ring: carColorHex(latestCarColor(cars)),
    ghost,
    approximate: !ghost && !!location?.approximate_enabled,
    moving: motion.moving,
    heading: motion.heading,
    status: ghost ? null : (location?.status_text ?? null),
    statusExpiresAt: location?.status_expires_at
      ? new Date(location.status_expires_at).getTime()
      : null,
  };
}

export type MeMarker = ReturnType<typeof meMarker>;

export function meetupMarkers(meetups: Meetup[] | undefined) {
  return (meetups ?? []).map((m) => ({
    id: m.id,
    lat: m.lat,
    lng: m.lng,
    icon: meetupVibe(m.vibe).icon,
    interestCount: m.interest_count,
    hereNowCount: m.here_now_count,
  }));
}

export function spotMarkers(
  spots: Spot[] | undefined,
  friends: FriendMarker[],
  me: MeMarker,
  photoCounts: Record<string, number> | undefined,
) {
  const people = friends.filter((f) => !f.approximate);
  const present = me && !me.ghost ? [...people, { lat: me.lat, lng: me.lng }] : people;
  return (spots ?? []).map((spot) => ({
    id: spot.id,
    kind: spot.kind,
    lat: spot.lat,
    lng: spot.lng,
    title: spotTitle(spot),
    icon: SPOT_ICONS[spotIconKey(spot)],
    hereNow: spot.kind === 'ragg' ? countHereNow(spot, present) : 0,
    photoCount: photoCounts?.[spot.id] ?? 0,
    expiresAt: spot.expires_at ? new Date(spot.expires_at).getTime() : null,
  }));
}
