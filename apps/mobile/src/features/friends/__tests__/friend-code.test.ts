import { describe, expect, it } from '@jest/globals';

import {
  formatFriendCode,
  normalizeFriendCode,
  parseScannedFriendCode,
} from '@/features/friends/friend-code';

describe('normalizeFriendCode', () => {
  it('uppercases, drops separators and caps the length', () => {
    expect(normalizeFriendCode('k7p-2qx')).toBe('K7P2QX');
    expect(normalizeFriendCode('k7p 2qx extra')).toBe('K7P2QX');
  });

  it('drops characters outside the unambiguous alphabet', () => {
    expect(normalizeFriendCode('O0I1L')).toBe('');
  });
});

describe('formatFriendCode', () => {
  it('splits a full code in two groups', () => {
    expect(formatFriendCode('K7P2QX')).toBe('K7P-2QX');
    expect(formatFriendCode('K7')).toBe('K7');
  });
});

describe('parseScannedFriendCode', () => {
  it('reads the app deep link and a bare code', () => {
    expect(parseScannedFriendCode('eparadar://add/K7P2QX')).toBe('K7P2QX');
    expect(parseScannedFriendCode('k7p-2qx')).toBe('K7P2QX');
  });

  it('ignores unrelated QR codes', () => {
    expect(parseScannedFriendCode('https://example.com/add/K7P2QX')).toBeNull();
    expect(parseScannedFriendCode('eparadar://add/ABC')).toBeNull();
  });
});
