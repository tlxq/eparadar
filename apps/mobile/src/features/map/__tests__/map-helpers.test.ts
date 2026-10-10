import { describe, expect, it } from '@jest/globals';

import { carColorHex, DEFAULT_RING_HEX } from '@/features/map/car-colors';
import { motionFromCoords } from '@/features/map/motion';

describe('motionFromCoords', () => {
  it('reports moving with a heading above walking pace', () => {
    expect(motionFromCoords({ speed: 8, heading: 92.5 })).toEqual({ moving: true, heading: 92.5 });
  });

  it('drops the heading when standing still', () => {
    expect(motionFromCoords({ speed: 0.4, heading: 180 })).toEqual({
      moving: false,
      heading: null,
    });
  });

  it('treats unknown speed and invalid heading as not usable', () => {
    expect(motionFromCoords({ speed: null, heading: 10 })).toEqual({
      moving: false,
      heading: null,
    });
    expect(motionFromCoords({ speed: 12, heading: -1 })).toEqual({ moving: true, heading: null });
  });
});

describe('carColorHex', () => {
  it('maps palette keys to their hex', () => {
    expect(carColorHex('rod')).toBe('#E5484D');
  });

  it('falls back to the brand ring for missing or unknown colors', () => {
    expect(carColorHex(null)).toBe(DEFAULT_RING_HEX);
    expect(carColorHex('hotpink')).toBe(DEFAULT_RING_HEX);
  });
});
