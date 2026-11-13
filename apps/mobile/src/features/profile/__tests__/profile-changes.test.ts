import { describe, expect, it } from '@jest/globals';

import { hasProfileChanges } from '@/features/profile/profile-changes';

const profile = { display_name: 'Kim', bio: 'Kör Volvo' };

describe('hasProfileChanges', () => {
  it('is false when nothing changed', () => {
    expect(hasProfileChanges(profile, { displayName: 'Kim', bio: 'Kör Volvo' })).toBe(false);
  });

  it('ignores surrounding spaces', () => {
    expect(hasProfileChanges(profile, { displayName: ' Kim ', bio: 'Kör Volvo ' })).toBe(false);
  });

  it('treats a missing bio and an empty bio as the same', () => {
    const noBio = { display_name: 'Kim', bio: null };
    expect(hasProfileChanges(noBio, { displayName: 'Kim', bio: '' })).toBe(false);
  });

  it('is true when the name or the bio changed', () => {
    expect(hasProfileChanges(profile, { displayName: 'Kimmie', bio: 'Kör Volvo' })).toBe(true);
    expect(hasProfileChanges(profile, { displayName: 'Kim', bio: '' })).toBe(true);
  });
});
