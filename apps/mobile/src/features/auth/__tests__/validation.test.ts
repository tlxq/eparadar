import { describe, expect, it } from '@jest/globals';

import {
  displayNameError,
  emailError,
  normalizeUsername,
  passwordError,
  usernameError,
} from '@/features/auth/validation';

describe('sign-up validation', () => {
  it('needs a display name', () => {
    expect(displayNameError('  ')).not.toBeNull();
    expect(displayNameError('Elsa')).toBeNull();
  });

  it('normalizes and checks usernames', () => {
    expect(normalizeUsername(' @Elsa_EPA ')).toBe('elsa_epa');
    expect(usernameError('Elsa_EPA')).toBeNull();
    expect(usernameError('el')).toBe('Minst 3 tecken.');
    expect(usernameError('elsa epa')).not.toBeNull();
    expect(usernameError('åsa')).not.toBeNull();
  });

  it('checks the email shape', () => {
    expect(emailError('elsa@example.se')).toBeNull();
    expect(emailError('elsa@example')).not.toBeNull();
    expect(emailError('')).toBe('Skriv din e-post.');
  });

  it('needs at least 8 characters in the password', () => {
    expect(passwordError('kort')).toBe('Minst 8 tecken. Du har 4.');
    expect(passwordError('långtlösenord')).toBeNull();
    expect(passwordError(' mellanrum ')).not.toBeNull();
  });
});
