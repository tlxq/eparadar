export const CAR_COLORS = [
  { key: 'rod', label: 'Röd', hex: '#E5484D' },
  { key: 'orange', label: 'Orange', hex: '#FF8A3D' },
  { key: 'gul', label: 'Gul', hex: '#F5C518' },
  { key: 'gron', label: 'Grön', hex: '#22C55E' },
  { key: 'bla', label: 'Blå', hex: '#2F6FED' },
  { key: 'lila', label: 'Lila', hex: '#9B5DE5' },
  { key: 'rosa', label: 'Rosa', hex: '#F472B6' },
  { key: 'vit', label: 'Vit', hex: '#F4F6F9' },
  { key: 'silver', label: 'Silver', hex: '#A2AAB8' },
  { key: 'svart', label: 'Svart', hex: '#2A2F3A' },
] as const;

export type CarColorKey = (typeof CAR_COLORS)[number]['key'];

export const DEFAULT_RING_HEX = '#2F6FED';

export function carColorHex(key: string | null | undefined): string {
  return CAR_COLORS.find((color) => color.key === key)?.hex ?? DEFAULT_RING_HEX;
}
