export type QuickTimeOption = 'tonight' | 'tomorrow' | 'weekend';

export function quickTimeToDate(option: QuickTimeOption, now = new Date()): Date {
  const result = new Date(now);
  if (option === 'tonight') {
    result.setHours(19, 0, 0, 0);
    if (result <= now) result.setDate(result.getDate() + 1);
    return result;
  }
  if (option === 'tomorrow') {
    result.setDate(result.getDate() + 1);
    result.setHours(18, 0, 0, 0);
    return result;
  }
  // weekend: upcoming Saturday, or today if it's already Saturday
  const daysUntilSaturday = (6 - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + daysUntilSaturday);
  result.setHours(14, 0, 0, 0);
  return result;
}

const WEEKDAYS = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];

export const MEETUP_LIVE_HOURS = 3;

function dayLabel(startsAt: Date, now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (startsAt.toDateString() === now.toDateString()) {
    return startsAt.getHours() >= 17 ? 'Ikväll' : 'Idag';
  }
  if (startsAt.toDateString() === tomorrow.toDateString()) return 'I morgon';
  if (startsAt.toDateString() === yesterday.toDateString()) return 'Igår';
  return `${WEEKDAYS[startsAt.getDay()]} ${startsAt.getDate()}/${startsAt.getMonth() + 1}`;
}

export function meetupPhase(startsAtIso: string, now = new Date()): 'upcoming' | 'live' | 'over' {
  const startsAt = new Date(startsAtIso).getTime();
  if (now.getTime() < startsAt) return 'upcoming';
  if (now.getTime() < startsAt + MEETUP_LIVE_HOURS * 3_600_000) return 'live';
  return 'over';
}

export function formatMeetupTime(startsAtIso: string, now = new Date()): string {
  const startsAt = new Date(startsAtIso);
  const time = startsAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const phase = meetupPhase(startsAtIso, now);
  if (phase === 'live') return `Pågår nu · ${time}`;
  if (phase === 'over') {
    const day =
      startsAt.toDateString() === now.toDateString()
        ? 'idag'
        : dayLabel(startsAt, now).toLowerCase();
    return `Slut · ${day} ${time}`;
  }
  return `${dayLabel(startsAt, now)} · ${time}`;
}
