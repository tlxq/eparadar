import { describe, expect, it, jest } from '@jest/globals';

import { showToast, showUndoToast, useToastStore, withFullStop } from '@/store/toast';

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

describe('showUndoToast', () => {
  it('commits when the toast closes without undo', () => {
    const onUndo = jest.fn<() => void>();
    const onCommit = jest.fn<() => void>();
    showUndoToast({ message: 'Bilden är borttagen', onUndo, onCommit });
    useToastStore.getState().dismiss();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('undoes without committing when Ångra is pressed', () => {
    const onUndo = jest.fn<() => void>();
    const onCommit = jest.fn<() => void>();
    showUndoToast({ message: 'Bilden är borttagen', onUndo, onCommit });
    useToastStore.getState().pressAction();
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits the previous one when a new toast replaces it', () => {
    const onCommit = jest.fn<() => void>();
    showUndoToast({ message: 'Statusen är borttagen', onUndo: jest.fn<() => void>(), onCommit });
    showToast({ message: 'Något annat' });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
