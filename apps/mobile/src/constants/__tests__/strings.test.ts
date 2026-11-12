import { describe, expect, it } from '@jest/globals';

import { countText, loadError, plural } from '@/constants/strings';

describe('strings', () => {
  it('builds the load error', () => {
    expect(loadError('Flödet')).toBe('Flödet gick inte att ladda. Kolla nätet och testa igen.');
  });

  it('picks singular or plural', () => {
    expect(plural(1, 'post', 'poster')).toBe('post');
    expect(plural(2, 'post', 'poster')).toBe('poster');
  });

  it('prefixes the count', () => {
    expect(countText(1, 'spot', 'spots')).toBe('1 spot');
    expect(countText(3, 'spot', 'spots')).toBe('3 spots');
  });
});
