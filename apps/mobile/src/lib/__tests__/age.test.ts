import { describe, expect, it } from '@jest/globals';

import { birthYearError } from '@/lib/age';

const now = new Date('2026-10-12T12:00:00Z');

describe('birthYearError', () => {
  it('accepts someone who turns 15 this year', () => {
    expect(birthYearError('2011', now)).toBeNull();
  });

  it('refuses someone younger than 15', () => {
    expect(birthYearError('2012', now)).toMatch(/15 år/);
  });

  it('refuses input that is not a year', () => {
    expect(birthYearError('09', now)).toMatch(/fyra siffror/);
    expect(birthYearError('2030', now)).toMatch(/inte rätt/);
  });
});
