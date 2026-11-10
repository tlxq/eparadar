export const MIN_PASSWORD_LENGTH = 8;
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const DISPLAY_NAME_MAX = 40;

export function displayNameError(input: string): string | null {
  const value = input.trim();
  if (!value) return 'Skriv vad dina kompisar ska se, t.ex. ditt förnamn.';
  if (value.length > DISPLAY_NAME_MAX) return `Max ${DISPLAY_NAME_MAX} tecken.`;
  return null;
}

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase();
}

export function usernameError(input: string): string | null {
  const value = normalizeUsername(input);
  if (!value) return 'Välj ett användarnamn.';
  if (value.length < USERNAME_MIN) return `Minst ${USERNAME_MIN} tecken.`;
  if (value.length > USERNAME_MAX) return `Max ${USERNAME_MAX} tecken.`;
  if (!/^[a-z0-9._]+$/.test(value)) {
    return 'Bara a–z, siffror, punkt och understreck. Inga mellanslag eller å, ä, ö.';
  }
  return null;
}

export function emailError(input: string): string | null {
  const value = input.trim();
  if (!value) return 'Skriv din e-post.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return 'Den e-postadressen ser inte rätt ut. Kolla stavningen.';
  }
  return null;
}

export function passwordError(input: string): string | null {
  if (!input) return 'Välj ett lösenord.';
  if (input.length < MIN_PASSWORD_LENGTH) {
    return `Minst ${MIN_PASSWORD_LENGTH} tecken. Du har ${input.length}.`;
  }
  if (input.trim() !== input) return 'Lösenordet kan inte börja eller sluta med mellanslag.';
  return null;
}
