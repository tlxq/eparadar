import { describe, expect, it } from '@jest/globals';

import {
  formatChatTimestamp,
  formatDayDivider,
  formatDisappearsAt,
  formatPostAge,
  formatTimeLeft,
} from '@/lib/relative-time';

const now = new Date(2026, 9, 8, 15, 0);

function at(daysAgo: number, hours: number, minutes = 0) {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

describe('formatPostAge', () => {
  it('shows minutes and hours within today', () => {
    expect(formatPostAge(at(0, 14, 59), now)).toBe('1 min');
    expect(formatPostAge(at(0, 12, 30), now)).toBe('2 tim');
  });

  it('shows nu for brand new posts', () => {
    expect(formatPostAge(now.toISOString(), now)).toBe('nu');
  });

  it('uses igår, weekday, then date', () => {
    expect(formatPostAge(at(1, 9), now)).toBe('i går');
    expect(formatPostAge(at(3, 9), now)).toBe('mån');
    expect(formatPostAge(at(10, 9), now)).toBe('28 sep');
    expect(formatPostAge(new Date(2025, 0, 2).toISOString(), now)).toBe('2 jan 2025');
  });
});

describe('formatChatTimestamp', () => {
  it('shows clock time today and weekday this week', () => {
    expect(formatChatTimestamp(at(0, 9, 5), now)).toBe('09:05');
    expect(formatChatTimestamp(at(1, 9), now)).toBe('i går');
    expect(formatChatTimestamp(at(2, 9), now)).toBe('tis');
  });
});

describe('formatDayDivider', () => {
  it('labels today and yesterday', () => {
    expect(formatDayDivider(at(0, 13, 2), now)).toBe('I dag 13:02');
    expect(formatDayDivider(at(1, 8), now)).toBe('I går 08:00');
  });
});

describe('formatTimeLeft', () => {
  it('shows hours and minutes left', () => {
    const in200 = new Date(now.getTime() + 200 * 60000).toISOString();
    expect(formatTimeLeft(in200, now)).toBe('Försvinner om 3 h 20 min');
  });

  it('shows minutes under an hour and whole hours', () => {
    expect(formatTimeLeft(new Date(now.getTime() + 45 * 60000).toISOString(), now)).toBe(
      'Försvinner om 45 min',
    );
    expect(formatTimeLeft(new Date(now.getTime() + 120 * 60000).toISOString(), now)).toBe(
      'Försvinner om 2 h',
    );
  });
});

describe('formatDisappearsAt', () => {
  it('shows the clock today, i morgon tomorrow, then the weekday', () => {
    expect(formatDisappearsAt(at(0, 23, 5), now)).toBe('Försvinner kl. 23:05');
    expect(formatDisappearsAt(at(-1, 8, 30), now)).toBe('Försvinner i morgon 08:30');
    expect(formatDisappearsAt(at(-3, 8, 30), now)).toBe('Försvinner sön 08:30');
  });
});
