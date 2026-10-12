import { describe, expect, it } from '@jest/globals';

import { showToast, useToastStore, withFullStop } from '@/store/toast';

describe('withFullStop', () => {
  it('adds a full stop when the message has no ending', () => {
    expect(withFullStop('Kunde inte spara')).toBe('Kunde inte spara.');
  });

  it('keeps an existing ending', () => {
    expect(withFullStop('Kärran är tillagd!')).toBe('Kärran är tillagd!');
    expect(withFullStop('Posten är borttagen.')).toBe('Posten är borttagen.');
    expect(withFullStop('Vill du ångra?')).toBe('Vill du ångra?');
  });
});

describe('showToast', () => {
  it('always shows a message that ends with punctuation', () => {
    showToast({ message: 'Network request failed' });
    expect(useToastStore.getState().toast?.message).toBe('Network request failed.');
  });
});
