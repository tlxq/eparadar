import { describe, expect, it } from '@jest/globals';

import { fallbackError, getErrorMessage, networkError } from '@/lib/errors';

describe('getErrorMessage', () => {
  it('translates auth error codes', () => {
    expect(
      getErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' }),
    ).toBe('Fel e-post eller lösenord.');
  });

  it('translates known English messages without a code', () => {
    expect(getErrorMessage(new Error('Invalid login credentials'))).toBe(
      'Fel e-post eller lösenord.',
    );
    expect(getErrorMessage(new TypeError('Network request failed'))).toBe(networkError);
  });

  it('keeps Swedish messages raised by the database', () => {
    expect(getErrorMessage({ code: 'P0001', message: 'Ni är redan vänner.' })).toBe(
      'Ni är redan vänner.',
    );
  });

  it('keeps Swedish messages thrown by the app', () => {
    expect(getErrorMessage(new Error('Du måste vara inloggad.'))).toBe('Du måste vara inloggad.');
  });

  it('hides other database errors', () => {
    expect(getErrorMessage({ code: '42P01', message: 'relation "x" does not exist' })).toBe(
      fallbackError,
    );
  });

  it('hides unknown English text', () => {
    expect(getErrorMessage(new Error('Something unexpected is not working'))).toBe(fallbackError);
  });

  it('falls back for non-errors', () => {
    expect(getErrorMessage(undefined)).toBe(fallbackError);
    expect(getErrorMessage('boom')).toBe(fallbackError);
  });
});
