import { describe, expect, it } from '@jest/globals';

import { latestCarColor, meMarker, spotMarkers } from '@/features/map/markers';
import type { Spot } from '@/features/map/spots';
import type { Car, Profile } from '@/lib/api';
import type { DbRow } from '@/lib/db-types';

const profile = { display_name: 'Tom', avatar_url: null } as Profile;
const still = { moving: false, heading: null };

function location(overrides: Partial<DbRow<'locations'>>) {
  return {
    lat: 59.3,
    lng: 18.0,
    sharing_enabled: true,
    approximate_enabled: false,
    status_text: 'Ute och rullar',
    status_expires_at: null,
    ...overrides,
  } as DbRow<'locations'>;
}

describe('latestCarColor', () => {
  it('picks the newest car that has a color', () => {
    const cars = [
      { color: 'red', created_at: '2026-01-01' },
      { color: null, created_at: '2026-03-01' },
      { color: 'blue', created_at: '2026-02-01' },
    ] as Pick<Car, 'color' | 'created_at'>[];
    expect(latestCarColor(cars)).toBe('blue');
  });

  it('returns null without cars', () => {
    expect(latestCarColor(undefined)).toBeNull();
  });
});

describe('meMarker', () => {
  it('prefers the device position over the stored one', () => {
    const me = meMarker({
      devicePosition: { lat: 1, lng: 2 },
      motion: still,
      location: location({}),
      profile,
      cars: [],
    });
    expect(me).toMatchObject({ lat: 1, lng: 2, ghost: false, status: 'Ute och rullar' });
  });

  it('hides status and approximate flag in ghost mode', () => {
    const me = meMarker({
      devicePosition: null,
      motion: still,
      location: location({ sharing_enabled: false, approximate_enabled: true }),
      profile,
      cars: [],
    });
    expect(me).toMatchObject({ ghost: true, approximate: false, status: null });
  });

  it('is null without a position or profile', () => {
    expect(
      meMarker({ devicePosition: null, motion: still, location: null, profile, cars: [] }),
    ).toBeNull();
  });
});

describe('spotMarkers', () => {
  const spot = {
    id: 's1',
    kind: 'ragg',
    lat: 59.3,
    lng: 18.0,
    name: 'Max',
    warning_type: null,
    expires_at: '2026-10-13T00:00:00Z',
  } as Spot;

  it('counts me as here unless I am a ghost', () => {
    const base = { devicePosition: { lat: 59.3, lng: 18.0 }, motion: still, profile, cars: [] };
    const visible = meMarker({ ...base, location: location({}) });
    const ghost = meMarker({ ...base, location: location({ sharing_enabled: false }) });
    expect(spotMarkers([spot], [], visible, { s1: 2 })[0]).toMatchObject({
      hereNow: 1,
      photoCount: 2,
    });
    expect(spotMarkers([spot], [], ghost, undefined)[0]).toMatchObject({
      hereNow: 0,
      photoCount: 0,
    });
  });
});
