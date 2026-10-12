import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/supabase', () => ({ supabase: { auth: {} } }));

import { authParams, isSignUpDatabaseError, isUnconfirmedEmailError } from '@/features/auth/api';

describe('authParams', () => {
  it('reads tokens from the fragment', () => {
    expect(
      authParams('eparadar://reset-password#access_token=a&refresh_token=b&type=recovery'),
    ).toEqual({ access_token: 'a', refresh_token: 'b', type: 'recovery' });
  });

  it('reads errors from both the query and the fragment', () => {
    expect(authParams('eparadar://?foo=1#error=access_denied&error_code=otp_expired')).toEqual({
      foo: '1',
      error: 'access_denied',
      error_code: 'otp_expired',
    });
  });

  it('returns nothing for a plain link', () => {
    expect(authParams('eparadar://friends')).toEqual({});
  });
});

describe('auth error helpers', () => {
  it('spots an unconfirmed email', () => {
    expect(isUnconfirmedEmailError({ code: 'email_not_confirmed' })).toBe(true);
    expect(isUnconfirmedEmailError(new Error('Email not confirmed'))).toBe(true);
    expect(isUnconfirmedEmailError({ code: 'invalid_credentials' })).toBe(false);
  });

  it('spots a failed profile insert at sign-up', () => {
    expect(isSignUpDatabaseError(new Error('Database error saving new user'))).toBe(true);
    expect(isSignUpDatabaseError(new Error('Invalid login credentials'))).toBe(false);
  });
});
