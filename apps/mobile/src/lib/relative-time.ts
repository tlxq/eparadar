const WEEKDAYS = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
const MONTHS = [
  'jan',
  'feb',
  'mars',
  'apr',
  'maj',
  'juni',
  'juli',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
];
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysBetween(date: Date, now: Date) {
  return Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS);
}

function shortDate(date: Date, now: Date) {
  const base = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

function clock(date: Date) {
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

export function formatPostAge(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return 'nu';
  if (minutes < 60) return `${minutes} min`;
  const days = daysBetween(date, now);
  if (days === 0) return `${Math.floor(minutes / 60)} tim`;
  if (days === 1) return 'igår';
  if (days < 7) return WEEKDAYS[date.getDay()];
  return shortDate(date, now);
}

export function formatChatTimestamp(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = daysBetween(date, now);
  if (days === 0) return clock(date);
  if (days === 1) return 'igår';
  if (days < 7) return WEEKDAYS[date.getDay()];
  return shortDate(date, now);
}

export function formatDayDivider(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = daysBetween(date, now);
  const time = clock(date);
  if (days === 0) return `Idag ${time}`;
  if (days === 1) return `Igår ${time}`;
  if (days < 7) return `${WEEKDAYS[date.getDay()]} ${time}`;
  return `${shortDate(date, now)} ${time}`;
}
