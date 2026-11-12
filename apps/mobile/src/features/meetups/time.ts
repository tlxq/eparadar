import { Days, sentenceStart } from '@/constants/strings';
import { clockText } from '@/lib/time';
export type QuickTimeOption = 'tonight' | 'tomorrow' | 'weekend';

const HALF_HOUR_MS = 30 * 60 * 1000;
const LATEST_TONIGHT_HOUR = 23;
const EVENING_HOUR = 19;

function roundUpToHalfHour(date: Date): Date {
  const result = new Date(Math.ceil(date.getTime() / HALF_HOUR_MS) * HALF_HOUR_MS);
  result.setSeconds(0, 0);
  return result;
}

export function quickTimeToDate(option: QuickTimeOption, now = new Date()): Date | null {
  const result = new Date(now);
  if (option === 'tonight') {
    if (now.getHours() >= LATEST_TONIGHT_HOUR) return null;
    result.setHours(EVENING_HOUR, 0, 0, 0);
    if (result.getTime() - now.getTime() >= HALF_HOUR_MS) return result;
    return roundUpToHalfHour(new Date(now.getTime() + HALF_HOUR_MS));
  }
  if (option === 'tomorrow') {
    result.setDate(result.getDate() + 1);
    result.setHours(EVENING_HOUR, 0, 0, 0);
    return result;
  }
  const daysUntilSaturday = (6 - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + daysUntilSaturday);
  result.setHours(14, 0, 0, 0);
  if (result.getTime() - now.getTime() < HALF_HOUR_MS) result.setDate(result.getDate() + 1);
  if (result.getTime() - now.getTime() < HALF_HOUR_MS) result.setDate(result.getDate() + 6);
  return result;
}

const LONG_WEEKDAYS = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

export function shortDayText(date: Date): string {
  return `${LONG_WEEKDAYS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

export function exactTimeText(date: Date): string {
  return `${shortDayText(date)} · ${clockText(date)}`;
}

const MAX_DAYS_AHEAD = 60;

export function isPickableTime(date: Date, now = new Date()): boolean {
  const ahead = date.getTime() - now.getTime();
  return ahead > 0 && ahead < MAX_DAYS_AHEAD * 24 * 3_600_000;
}

const WEEKDAYS = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];

const MEETUP_LIVE_HOURS = 3;

function dayLabel(startsAt: Date, now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (startsAt.toDateString() === now.toDateString()) {
    return sentenceStart(startsAt.getHours() >= 17 ? Days.tonight : Days.today);
  }
  if (startsAt.toDateString() === tomorrow.toDateString()) return sentenceStart(Days.tomorrow);
  if (startsAt.toDateString() === yesterday.toDateString()) return sentenceStart(Days.yesterday);
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
  const time = clockText(startsAt);
  const phase = meetupPhase(startsAtIso, now);
  if (phase === 'live') return `Pågår nu · ${time}`;
  if (phase === 'over') {
    const day =
      startsAt.toDateString() === now.toDateString()
        ? Days.today
        : dayLabel(startsAt, now).toLowerCase();
    return `Slut · ${day} ${time}`;
  }
  return `${dayLabel(startsAt, now)} · ${time}`;
}
