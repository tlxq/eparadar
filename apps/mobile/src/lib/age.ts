import { MINIMUM_AGE } from '@eparadar/legal';

export function birthYearError(input: string, now = new Date()): string | null {
  const value = input.trim();
  if (!/^\d{4}$/.test(value)) return 'Skriv ditt födelseår med fyra siffror, t.ex. 2009.';
  const year = Number(value);
  if (year < 1900 || year > now.getFullYear()) return 'Det födelseåret ser inte rätt ut.';
  if (now.getFullYear() - year < MINIMUM_AGE) {
    return `epaRadar är för dig som är ${MINIMUM_AGE} år eller äldre.`;
  }
  return null;
}
