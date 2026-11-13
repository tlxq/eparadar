import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

import { countHereNow, distanceMeters, formatDistance, spotTitle } from '@/features/map/spots';

const max = { lat: 59.3326, lng: 18.0649 };

describe('distanceMeters', () => {
  it('measures short distances in meters', () => {
    const north = { lat: max.lat + 0.0009, lng: max.lng };
    expect(Math.round(distanceMeters(max, north))).toBe(100);
  });
});

describe('countHereNow', () => {
  it('counts people within 100 m and ignores those further away', () => {
    const people = [
      { lat: max.lat + 0.0003, lng: max.lng },
      { lat: max.lat, lng: max.lng + 0.001 },
      { lat: max.lat + 0.01, lng: max.lng },
    ];
    expect(countHereNow(max, people)).toBe(2);
  });
});

describe('spotTitle', () => {
  it('uses the name for a Häng spot and the type for a warning', () => {
    expect(spotTitle({ kind: 'ragg', name: 'Max-rondellen', warning_type: null })).toBe(
      'Max-rondellen',
    );
    expect(spotTitle({ kind: 'ragg', name: null, warning_type: null })).toBe('Häng');
    expect(spotTitle({ kind: 'varning', name: null, warning_type: 'halka' })).toBe('Halka');
  });
});

describe('formatDistance', () => {
  it('uses meters under a kilometer and km above', () => {
    expect(formatDistance(4)).toBe('10 m');
    expect(formatDistance(347)).toBe('350 m');
    expect(formatDistance(1460)).toBe('1,5 km');
  });
});
