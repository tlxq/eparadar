import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { visibleLayers } from '@/features/map/use-map-filters';
import { findNearbyWarning, roundedDistance } from '@/features/map/use-nearby-warning';

const here = { lat: 59.3, lng: 18.1 };
const north200 = { lat: 59.3018, lng: 18.1 };
const later = Date.now() + 3_600_000;

function warning(id: string, at: { lat: number; lng: number }, mine = false) {
  return { id, kind: 'varning', title: 'Halka', mine, expiresAt: later, ...at };
}

describe('findNearbyWarning', () => {
  it('finds a warning ahead within 300 m', () => {
    const found = findNearbyWarning(here, 0, true, [warning('a', north200)], new Set());
    expect(found?.id).toBe('a');
    expect(found?.ahead).toBe(true);
    expect(roundedDistance(found!.meters)).toBe(200);
  });

  it('says bort when the warning is behind or you stand still', () => {
    expect(findNearbyWarning(here, 180, true, [warning('a', north200)], new Set())?.ahead).toBe(
      false,
    );
    expect(findNearbyWarning(here, 0, false, [warning('a', north200)], new Set())?.ahead).toBe(
      false,
    );
  });

  it('skips far, own, seen and expired warnings', () => {
    const far = warning('far', { lat: 59.31, lng: 18.1 });
    const own = warning('own', north200, true);
    const seen = warning('seen', north200);
    const old = { ...warning('old', north200), expiresAt: Date.now() - 1000 };
    expect(findNearbyWarning(here, 0, true, [far, own, seen, old], new Set(['seen']))).toBeNull();
  });
});

describe('visibleLayers', () => {
  const layers = {
    friends: [{ id: 'f' }],
    meetups: [{ id: 'm' }],
    spots: [
      { id: 'r', kind: 'ragg' },
      { id: 'w', kind: 'varning' },
    ],
  };

  it('hides the layers that are turned off', () => {
    const shown = visibleLayers(layers, ['friends', 'warnings']);
    expect(shown.friends).toEqual([]);
    expect(shown.meetups).toHaveLength(1);
    expect(shown.spots.map((spot) => spot.id)).toEqual(['r']);
  });
});
