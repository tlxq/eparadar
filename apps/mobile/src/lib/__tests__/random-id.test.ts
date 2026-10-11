import { describe, expect, it } from '@jest/globals';

import { randomId } from '@/lib/random-id';

describe('randomId', () => {
  it('makes v4 uuids Postgres accepts', () => {
    expect(randomId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('does not repeat', () => {
    expect(new Set(Array.from({ length: 500 }, randomId)).size).toBe(500);
  });
});
