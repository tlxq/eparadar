import { describe, expect, it } from '@jest/globals';

import { MAP_LABEL_SCRIPT } from '@/features/map/map-labels';

type Rect = { left: number; top: number; right: number; bottom: number };
type Item = { id: number; owner: number; prio: number; name: string | null; rect: Rect };

const api = new Function(
  `${MAP_LABEL_SCRIPT}; return { agoText, shortStatus, labelParts, labelPriority, hiddenLabels };`,
)() as {
  agoText: (ms: number) => string;
  shortStatus: (text: string, max: number) => string;
  labelParts: (
    name: string,
    ageMs: number,
    stale: boolean,
    driving: boolean,
  ) => { name: string; extra: string };
  labelPriority: (classNames: string) => number;
  hiddenLabels: (
    items: Item[],
    obstacles: { owner: number; rect: Rect }[],
    gap: number,
    reach: number,
  ) => number[];
};

const box = (left: number, top: number, w = 60, h = 14): Rect => ({
  left,
  top,
  right: left + w,
  bottom: top + h,
});

describe('agoText', () => {
  it('counts minutes, hours and days', () => {
    expect(api.agoText(18 * 60000)).toBe('18 min sedan');
    expect(api.agoText(3 * 3600000)).toBe('3 h sedan');
    expect(api.agoText(30 * 3600000)).toBe('över ett dygn sedan');
  });
});

describe('labelParts', () => {
  it('puts name and age in one label', () => {
    expect(api.labelParts('Ella Ek', 18 * 60000, true, false)).toEqual({
      name: 'Ella Ek',
      extra: '18 min sedan',
    });
  });

  it('says kör when driving and nothing when idle', () => {
    expect(api.labelParts('Ella Ek', 0, false, true).extra).toBe('kör');
    expect(api.labelParts('Ella Ek', 0, false, false).extra).toBe('');
  });
});

describe('shortStatus', () => {
  it('keeps short text as is', () => {
    expect(api.shortStatus('På väg till macken', 44)).toBe('På väg till macken');
  });

  it('cuts at a word boundary, never mid-word', () => {
    const out = api.shortStatus('På väg till Ica Maxi i Nacka för att fika och tanka kärran', 30);
    expect(out).toBe('På väg till Ica Maxi i Nacka…');
  });

  it('cuts a single long word hard', () => {
    expect(api.shortStatus('Superlångtordutansmellanrum', 10)).toBe('Superlångt…');
  });
});

describe('labelPriority', () => {
  it('ranks own marker above people, spots, meets and posts', () => {
    const p = (c: string) => api.labelPriority(c);
    expect(p('mk person me')).toBeGreaterThan(p('mk person'));
    expect(p('mk person')).toBeGreaterThan(p('mk spot is-hot'));
    expect(p('mk spot')).toBeGreaterThan(p('mk meet'));
    expect(p('mk meet')).toBeGreaterThan(p('mk drop'));
  });
});

describe('hiddenLabels', () => {
  it('hides the lower priority label when two overlap', () => {
    const items: Item[] = [
      { id: 0, owner: 0, prio: 4, name: null, rect: box(10, 10) },
      { id: 1, owner: 1, prio: 6, name: null, rect: box(20, 12) },
    ];
    expect(api.hiddenLabels(items, [], 2, 100)).toEqual([0]);
  });

  it('keeps labels that do not overlap', () => {
    const items: Item[] = [
      { id: 0, owner: 0, prio: 4, name: null, rect: box(10, 10) },
      { id: 1, owner: 1, prio: 6, name: null, rect: box(100, 100) },
    ];
    expect(api.hiddenLabels(items, [], 2, 100)).toEqual([]);
  });

  it('hides a label that sits on another marker but not on its own', () => {
    const items: Item[] = [{ id: 0, owner: 0, prio: 5, name: null, rect: box(10, 10) }];
    expect(api.hiddenLabels(items, [{ owner: 1, rect: box(20, 10, 40, 40) }], 0, 100)).toEqual([0]);
    expect(api.hiddenLabels(items, [{ owner: 0, rect: box(20, 10, 40, 40) }], 0, 100)).toEqual([]);
  });

  it('shows a name once when a friend and their post sit close together', () => {
    const items: Item[] = [
      { id: 0, owner: 0, prio: 3, name: 'Ella Ek', rect: box(10, 60) },
      { id: 1, owner: 1, prio: 6, name: 'Ella Ek', rect: box(10, 10) },
    ];
    expect(api.hiddenLabels(items, [], 2, 100)).toEqual([0]);
  });

  it('keeps the same name when the markers are far apart', () => {
    const items: Item[] = [
      { id: 0, owner: 0, prio: 3, name: 'Ella Ek', rect: box(10, 400) },
      { id: 1, owner: 1, prio: 6, name: 'Ella Ek', rect: box(10, 10) },
    ];
    expect(api.hiddenLabels(items, [], 2, 100)).toEqual([]);
  });
});
