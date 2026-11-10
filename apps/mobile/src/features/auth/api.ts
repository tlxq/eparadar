import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

export const RESEND_COOLDOWN_S = 60;

function authRedirectUrl(path: '/' | '/reset-password') {
  return Linking.createURL(path);
}

type SignUpResult = { needsConfirmation: boolean };

export async function signUpWithProfile(input: {
  email: string;
  password: string;
  username: string;
  displayName: string;
  birthYear: number;
}): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: authRedirectUrl('/'),
      data: {
        username: input.username,
        display_name: input.displayName,
        birth_year: String(input.birthYear),
      },
    },
  });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: authRedirectUrl('/') },
  });
  if (error) throw error;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirectUrl('/reset-password'),
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export function isUnconfirmedEmailError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { code, message } = err as { code?: unknown; message?: unknown };
  return (
    code === 'email_not_confirmed' ||
    (typeof message === 'string' && /email not confirmed/i.test(message))
  );
}

export function isSignUpDatabaseError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { message } = err as { message?: unknown };
  return typeof message === 'string' && /database error saving new user/i.test(message);
}

export function authParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const parts: string[] = [];
  if (queryIndex !== -1 && (hashIndex === -1 || queryIndex < hashIndex)) {
    parts.push(url.slice(queryIndex + 1, hashIndex === -1 ? undefined : hashIndex));
  }
  if (hashIndex !== -1) parts.push(url.slice(hashIndex + 1));
  for (const part of parts) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const [rawKey, ...rest] = pair.split('=');
      const decode = (text: string) => decodeURIComponent(text.replace(/\+/g, ' '));
      try {
        params[decode(rawKey)] = decode(rest.join('='));
      } catch {
        continue;
      }
    }
  }
  return params;
}

type AuthLinkResult =
  { kind: 'session'; type: string | null } | { kind: 'error'; code: string | null } | null;

export async function handleAuthLink(url: string): Promise<AuthLinkResult> {
  const params = authParams(url);
  if (params.error_code || params.error) {
    return { kind: 'error', code: params.error_code ?? params.error ?? null };
  }
  if (!params.access_token || !params.refresh_token) return null;
  const { error } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  if (error) return { kind: 'error', code: error.code ?? null };
  return { kind: 'session', type: params.type ?? null };
}
