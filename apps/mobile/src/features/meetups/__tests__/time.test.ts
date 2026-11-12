import { describe, expect, it } from '@jest/globals';

import {
  exactTimeText,
  formatMeetupTime,
  meetupPhase,
  quickTimeToDate,
} from '@/features/meetups/time';

const now = new Date(2026, 9, 12, 20, 0);

function at(hoursFromNow: number) {
  return new Date(now.getTime() + hoursFromNow * 3_600_000).toISOString();
}

describe('meetupPhase', () => {
  it('is upcoming, live, then over', () => {
    expect(meetupPhase(at(1), now)).toBe('upcoming');
    expect(meetupPhase(at(-1), now)).toBe('live');
    expect(meetupPhase(at(-4), now)).toBe('over');
  });
});

describe('formatMeetupTime', () => {
  it('shows Pågår nu while live', () => {
    expect(formatMeetupTime(at(-1), now)).toMatch(/^Pågår nu · /);
  });

  it('shows Slut after the meetup', () => {
    expect(formatMeetupTime(at(-4), now)).toMatch(/^Slut · i dag /);
    expect(formatMeetupTime(at(-24), now)).toMatch(/^Slut · i går /);
  });

  it('shows the day for upcoming meetups', () => {
    expect(formatMeetupTime(at(1), now)).toMatch(/^I kväll · /);
    expect(formatMeetupTime(at(20), now)).toMatch(/^I morgon · /);
  });
});

describe('quickTimeToDate', () => {
  it('uses 19:00 for I kväll during the day', () => {
    const noon = new Date(2026, 9, 12, 14, 0);
    expect(exactTimeText(quickTimeToDate('tonight', noon)!)).toBe('Mån 12/10 · 19:00');
  });

  it('keeps I kväll on the same evening after 19', () => {
    const late = new Date(2026, 9, 12, 20, 10);
    expect(exactTimeText(quickTimeToDate('tonight', late)!)).toBe('Mån 12/10 · 21:00');
  });

  it('has no I kväll after 23', () => {
    expect(quickTimeToDate('tonight', new Date(2026, 9, 12, 23, 5))).toBeNull();
  });

  it('never picks a weekend time that has passed', () => {
    const saturdayEvening = new Date(2026, 9, 17, 18, 0);
    expect(exactTimeText(quickTimeToDate('weekend', saturdayEvening)!)).toBe('Sön 18/10 · 14:00');
    const sundayEvening = new Date(2026, 9, 18, 18, 0);
    expect(exactTimeText(quickTimeToDate('weekend', sundayEvening)!)).toBe('Lör 24/10 · 14:00');
  });
});
