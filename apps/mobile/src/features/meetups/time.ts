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

export function formatMeetupTime(startsAtIso: string, now = new Date()): string {
  const startsAt = new Date(startsAtIso);
  const time = startsAt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
  const isToday = startsAt.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = startsAt.toDateString() === tomorrow.toDateString();

  if (isToday) return startsAt > now ? `Ikväll · ${time}` : `Pågår nu · ${time}`;
  if (isTomorrow) return `I morgon · ${time}`;
  return `${WEEKDAYS[startsAt.getDay()]} ${startsAt.getDate()}/${startsAt.getMonth() + 1} · ${time}`;
}
