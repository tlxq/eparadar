import { supabase } from '@/lib/supabase';

export const FRIEND_CODE_LENGTH = 6;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export type FriendCode = {
  code: string;
  expires_at: string;
};

export type RedeemOutcome =
  'sent' | 'accepted' | 'already_sent' | 'already_friends' | 'own_code' | 'invalid';

export type RedeemResult = {
  outcome: RedeemOutcome;
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function normalizeFriendCode(input: string): string {
  return input
    .toUpperCase()
    .split('')
    .filter((char) => ALPHABET.includes(char))
    .join('')
    .slice(0, FRIEND_CODE_LENGTH);
}

export function formatFriendCode(code: string): string {
  return code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export function friendCodeLink(code: string): string {
  return `eparadar://add/${code}`;
}

export function parseScannedFriendCode(data: string): string | null {
  const match = data.trim().match(/^(?:eparadar:\/\/add\/)?([A-Za-z0-9-]{6,7})$/);
  if (!match) return null;
  const code = normalizeFriendCode(match[1]);
  return code.length === FRIEND_CODE_LENGTH ? code : null;
}

export async function fetchFriendCode(rotate = false): Promise<FriendCode> {
  const { data, error } = await supabase.rpc('current_friend_code', { rotate });
  if (error) throw error;
  return data as unknown as FriendCode;
}

export async function redeemFriendCode(code: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc('redeem_friend_code', { friend_code: code });
  if (error) throw error;
  const row = (data as unknown as RedeemResult[] | null)?.[0];
  if (!row) throw new Error('Något gick fel. Försök igen.');
  return row;
}
