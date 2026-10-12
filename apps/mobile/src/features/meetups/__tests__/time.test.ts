import { describe, expect, it } from '@jest/globals';

import { formatMeetupTime, meetupPhase } from '@/features/meetups/time';

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
    expect(formatMeetupTime(at(-4), now)).toMatch(/^Slut · idag /);
    expect(formatMeetupTime(at(-24), now)).toMatch(/^Slut · igår /);
  });

  it('shows the day for upcoming meetups', () => {
    expect(formatMeetupTime(at(1), now)).toMatch(/^Ikväll · /);
    expect(formatMeetupTime(at(20), now)).toMatch(/^I morgon · /);
  });
});
