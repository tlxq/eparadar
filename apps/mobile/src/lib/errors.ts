export const fallbackError = 'Något gick fel. Försök igen.';
export const networkError = 'Ingen kontakt med servern. Kolla nätet och försök igen.';

const authCodes: Record<string, string> = {
  invalid_credentials: 'Fel e-post eller lösenord.',
  email_not_confirmed: 'Du behöver bekräfta din e-post först. Kolla inkorgen och skräpposten.',
  user_already_exists: 'Det finns redan ett konto med den e-posten.',
  email_exists: 'Det finns redan ett konto med den e-posten.',
  weak_password: 'Lösenordet är för svagt. Välj minst 8 tecken.',
  email_address_invalid: 'Den e-postadressen funkar inte.',
  validation_failed: 'Kolla att e-post och lösenord stämmer.',
  over_email_send_rate_limit: 'För många mejl på kort tid. Vänta en stund och försök igen.',
  over_request_rate_limit: 'För många försök. Vänta en stund och försök igen.',
  same_password: 'Det nya lösenordet måste skilja sig från det gamla.',
  session_not_found: 'Du har loggats ut. Logga in igen.',
  session_expired: 'Du har loggats ut. Logga in igen.',
  refresh_token_not_found: 'Du har loggats ut. Logga in igen.',
  user_not_found: 'Kontot hittades inte.',
  signup_disabled: 'Det går inte att skapa konto just nu.',
  otp_expired: 'Länken har gått ut. Be om en ny.',
};

const englishMessages: [RegExp, string][] = [
  [/invalid login credentials/i, authCodes.invalid_credentials],
  [/email not confirmed/i, authCodes.email_not_confirmed],
  [/user already registered/i, authCodes.user_already_exists],
  [/password should be at least/i, authCodes.weak_password],
  [/unable to validate email|invalid format/i, authCodes.email_address_invalid],
  [/rate limit|too many requests/i, authCodes.over_request_rate_limit],
  [/not authenticated|jwt expired|invalid jwt|auth session missing/i, authCodes.session_not_found],
  [/network request failed|failed to fetch|network error|load failed|fetch failed/i, networkError],
  [/exceeded the maximum allowed size|payload too large/i, 'Filen är för stor.'],
  [/mime type .* is not supported|invalid mime/i, 'Den filtypen funkar inte.'],
  [/row-level security|permission denied/i, 'Du har inte behörighet att göra det.'],
  [/duplicate key value/i, 'Det finns redan.'],
  [
    /violates check constraint|value too long/i,
    'Något av fälten stämmer inte. Kolla och försök igen.',
  ],
  [/a conversation needs at least 2 members/i, 'En chatt behöver minst två personer.'],
  [/edge function returned a non-2xx/i, fallbackError],
];

function hasEnglishShape(message: string) {
  return (
    /^[\x20-\x7e]+$/.test(message) &&
    !/[åäöÅÄÖ]/.test(message) &&
    /\b(the|is|not|of|to|failed|invalid|error|could|cannot|unable)\b/i.test(message)
  );
}

export function getErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return fallbackError;
  const { message, code } = err as { message?: unknown; code?: unknown };
  if (typeof code === 'string' && authCodes[code]) return authCodes[code];
  if (typeof message !== 'string' || !message.trim()) return fallbackError;
  for (const [pattern, text] of englishMessages) {
    if (pattern.test(message)) return text;
  }
  if (typeof code === 'string' && code !== 'P0001') return fallbackError;
  if (hasEnglishShape(message)) return fallbackError;
  return message;
}
