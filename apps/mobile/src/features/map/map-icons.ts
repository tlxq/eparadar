const WHITE = '#F4F6F9';
const ORANGE = '#FF8A3D';

function duo(back: string, front: string): string {
  return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">${back}${front}</svg>`;
}

export const SPOT_ICONS = {
  ragg: duo(
    `<path d="M24 44s13-11.5 13-22a13 13 0 1 0-26 0c0 10.5 13 22 13 22Z" fill="${ORANGE}" fill-opacity=".38"/>`,
    `<path d="M24 44s13-11.5 13-22a13 13 0 1 0-26 0c0 10.5 13 22 13 22Z" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round"/><path d="M16.5 24.5v-3l2.2-5h10.6l2.2 5v3z" stroke="${WHITE}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="19.5" cy="22" r="1.4" fill="${ORANGE}"/><circle cx="28.5" cy="22" r="1.4" fill="${ORANGE}"/>`,
  ),
  vagarbete: duo(
    `<path d="M19 9h10l7 29H12z" fill="${ORANGE}" fill-opacity=".38"/>`,
    `<path d="M19 9h10l7 29H12z" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round"/><path d="M16.3 21h15.4M14.2 30h19.6" stroke="${ORANGE}" stroke-width="3.4"/><path d="M8 40h32" stroke="${WHITE}" stroke-width="3.4" stroke-linecap="round"/>`,
  ),
  halka: duo(
    `<circle cx="24" cy="24" r="17" fill="${ORANGE}" fill-opacity=".3"/>`,
    `<path d="M24 8v32M10.2 16l27.6 16M10.2 32l27.6-16" stroke="${WHITE}" stroke-width="3" stroke-linecap="round"/><path d="m19.5 10.5 4.5 4 4.5-4M19.5 37.5l4.5-4 4.5 4" stroke="${ORANGE}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  grop: duo(
    `<path d="M8 40 18 8h12l10 32z" fill="${ORANGE}" fill-opacity=".3"/>`,
    `<path d="M8 40 18 8M40 40 30 8" stroke="${WHITE}" stroke-width="3" stroke-linecap="round"/><path d="M24 10v5M24 20v4" stroke="${WHITE}" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="24" cy="33" rx="7" ry="3.6" fill="${ORANGE}"/>`,
  ),
  avstangt: duo(
    `<rect x="6" y="15" width="36" height="12" rx="3" fill="${ORANGE}" fill-opacity=".38"/>`,
    `<rect x="6" y="15" width="36" height="12" rx="3" stroke="${WHITE}" stroke-width="3"/><path d="m13 15 8 12M24 15l8 12M35 15l5 7.5" stroke="${ORANGE}" stroke-width="3"/><path d="M12 27v13M36 27v13" stroke="${WHITE}" stroke-width="3.2" stroke-linecap="round"/>`,
  ),
} as const;

export type SpotIconKey = keyof typeof SPOT_ICONS;

export function spotIconKey(spot: { kind: string; warning_type: string | null }): SpotIconKey {
  if (spot.kind === 'ragg') return 'ragg';
  const key = spot.warning_type as SpotIconKey | null;
  return key && key in SPOT_ICONS ? key : 'vagarbete';
}
