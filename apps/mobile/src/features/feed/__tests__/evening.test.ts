import { describe, expect, it } from '@jest/globals';

import { isEvening, isTonight, plotPoints } from '@/features/feed/evening';

describe('isEvening', () => {
  it('is evening from 18 to 4', () => {
    expect(isEvening(new Date(2026, 9, 12, 17, 59))).toBe(false);
    expect(isEvening(new Date(2026, 9, 12, 18, 0))).toBe(true);
    expect(isEvening(new Date(2026, 9, 13, 2, 0))).toBe(true);
    expect(isEvening(new Date(2026, 9, 13, 4, 0))).toBe(false);
  });
});

describe('isTonight', () => {
  const now = new Date(2026, 9, 12, 20, 0);

  it('counts meets from this afternoon until early tomorrow', () => {
    expect(isTonight(new Date(2026, 9, 12, 21, 0).toISOString(), now)).toBe(true);
    expect(isTonight(new Date(2026, 9, 13, 1, 0).toISOString(), now)).toBe(true);
    expect(isTonight(new Date(2026, 9, 13, 19, 0).toISOString(), now)).toBe(false);
    expect(isTonight(new Date(2026, 9, 12, 9, 0).toISOString(), now)).toBe(false);
  });

  it('after midnight still means the evening that started yesterday', () => {
    const late = new Date(2026, 9, 13, 1, 30);
    expect(isTonight(new Date(2026, 9, 12, 22, 0).toISOString(), late)).toBe(true);
  });
});

describe('plotPoints', () => {
  it('fits nearby points inside the box and drops far away ones', () => {
    const points = [
      { id: 'a', kind: 'ragg' as const, lat: 59.33, lng: 18.06 },
      { id: 'b', kind: 'meet' as const, lat: 59.34, lng: 18.08 },
      { id: 'c', kind: 'varning' as const, lat: 59.32, lng: 18.05 },
      { id: 'far', kind: 'ragg' as const, lat: 57.7, lng: 11.97 },
    ];
    const plotted = plotPoints(points, 300, 120);
    expect(plotted.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    plotted.forEach((p) => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(300);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(120);
    });
  });

  it('returns nothing without points', () => {
    expect(plotPoints([], 300, 120)).toEqual([]);
  });
});
