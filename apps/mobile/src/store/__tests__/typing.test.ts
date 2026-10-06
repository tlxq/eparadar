import { describe, expect, it } from '@jest/globals';

import { activeTypists, TYPING_TTL_MS, typingLabel } from '@/store/typing';

describe('activeTypists', () => {
  it('ignores me and anyone who stopped typing a while ago', () => {
    const now = 100_000;
    const typists = {
      me: { name: 'Tom', at: now },
      saga: { name: 'Saga Lind', at: now - 1000 },
      liam: { name: 'Liam Berg', at: now - TYPING_TTL_MS - 1 },
    };
    expect(activeTypists(typists, 'me', now).map((typist) => typist.name)).toEqual(['Saga Lind']);
  });
});

describe('typingLabel', () => {
  it('names a single typist in groups and counts several', () => {
    expect(typingLabel([], true)).toBeNull();
    expect(typingLabel([{ name: 'Saga Lind', at: 0 }], false)).toBe('skriver…');
    expect(typingLabel([{ name: 'Saga Lind', at: 0 }], true)).toBe('Saga skriver…');
    expect(
      typingLabel(
        [
          { name: 'Saga Lind', at: 0 },
          { name: 'Liam Berg', at: 0 },
        ],
        true,
      ),
    ).toBe('2 skriver…');
  });
});
