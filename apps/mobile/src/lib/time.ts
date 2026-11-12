export const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function daysBetween(date: Date, now: Date): number {
  return Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS);
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function clockText(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}
