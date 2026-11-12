import { describe, expect, it } from '@jest/globals';

import { clockText, daysBetween, pad2, startOfDay } from '@/lib/time';

describe('time', () => {
  it('pads to two digits', () => {
    expect(pad2(5)).toBe('05');
    expect(pad2(12)).toBe('12');
  });

  it('formats HH:MM', () => {
    expect(clockText(new Date(2026, 10, 12, 7, 3))).toBe('07:03');
    expect(clockText(new Date(2026, 10, 12, 23, 59))).toBe('23:59');
  });

  it('finds the start of the day', () => {
    const start = startOfDay(new Date(2026, 10, 12, 15, 30, 10));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getDate()).toBe(12);
  });

  it('counts calendar days', () => {
    const now = new Date(2026, 10, 12, 1, 0);
    expect(daysBetween(new Date(2026, 10, 11, 23, 0), now)).toBe(1);
    expect(daysBetween(new Date(2026, 10, 12, 0, 5), now)).toBe(0);
  });
});
