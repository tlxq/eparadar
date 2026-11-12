import { CarPaint } from '@eparadar/theme/colors';

export const CAR_COLORS = CarPaint.colors;

export const DEFAULT_RING_HEX = CarPaint.defaultHex;

export function carColorHex(key: string | null | undefined): string {
  return CAR_COLORS.find((color) => color.key === key)?.hex ?? DEFAULT_RING_HEX;
}
