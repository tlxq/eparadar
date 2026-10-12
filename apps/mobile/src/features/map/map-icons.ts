import { Colors } from '@eparadar/theme/colors';

const WHITE = '#F4F6F9';
const ORANGE = '#FF8A3D';
const YELLOW = Colors.dark.warning;
const BLUE = '#2F6FED';
const BLUE_SOFT = '#7EA6FF';
const MAP_BG = '#0E1320';

function duo(back: string, front: string): string {
  return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">${back}${front}</svg>`;
}

export const SPOT_ICONS = {
  ragg: duo(
    `<circle cx="24" cy="27" r="16" fill="${ORANGE}" fill-opacity=".38"/>`,
    `<path d="M10.5 34v-6.5l4.5-9.5h18l4.5 9.5V34z" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round"/><path d="M14 34v4.5M34 34v4.5" stroke="${WHITE}" stroke-width="3.2" stroke-linecap="round"/><path d="M15 27.5h18" stroke="${WHITE}" stroke-width="2.4" stroke-linecap="round"/><circle cx="17" cy="31" r="1.8" fill="${ORANGE}"/><circle cx="31" cy="31" r="1.8" fill="${ORANGE}"/><path d="m38 3 1.7 4.3L44 9l-4.3 1.7L38 15l-1.7-4.3L32 9l4.3-1.7z" fill="${ORANGE}"/><path d="M9 6v6M6 9h6" stroke="${ORANGE}" stroke-width="2.4" stroke-linecap="round"/>`,
  ),
  vagarbete: duo(
    `<path d="M19 9h10l7 29H12z" fill="${YELLOW}" fill-opacity=".38"/>`,
    `<path d="M19 9h10l7 29H12z" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round"/><path d="M16.3 21h15.4M14.2 30h19.6" stroke="${YELLOW}" stroke-width="3.4"/><path d="M8 40h32" stroke="${WHITE}" stroke-width="3.4" stroke-linecap="round"/>`,
  ),
  halka: duo(
    `<circle cx="24" cy="24" r="17" fill="${YELLOW}" fill-opacity=".3"/>`,
    `<path d="M24 8v32M10.2 16l27.6 16M10.2 32l27.6-16" stroke="${WHITE}" stroke-width="3" stroke-linecap="round"/><path d="m19.5 10.5 4.5 4 4.5-4M19.5 37.5l4.5-4 4.5 4" stroke="${YELLOW}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  grop: duo(
    `<path d="M8 40 18 8h12l10 32z" fill="${YELLOW}" fill-opacity=".3"/>`,
    `<path d="M8 40 18 8M40 40 30 8" stroke="${WHITE}" stroke-width="3" stroke-linecap="round"/><path d="M24 10v5M24 20v4" stroke="${WHITE}" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="24" cy="33" rx="7" ry="3.6" fill="${YELLOW}"/>`,
  ),
  avstangt: duo(
    `<rect x="6" y="15" width="36" height="12" rx="3" fill="${YELLOW}" fill-opacity=".38"/>`,
    `<rect x="6" y="15" width="36" height="12" rx="3" stroke="${WHITE}" stroke-width="3"/><path d="m13 15 8 12M24 15l8 12M35 15l5 7.5" stroke="${YELLOW}" stroke-width="3"/><path d="M12 27v13M36 27v13" stroke="${WHITE}" stroke-width="3.2" stroke-linecap="round"/>`,
  ),
} as const;

export type SpotIconKey = keyof typeof SPOT_ICONS;

export function spotIconKey(spot: { kind: string; warning_type: string | null }): SpotIconKey {
  if (spot.kind === 'ragg') return 'ragg';
  const key = spot.warning_type as SpotIconKey | null;
  return key && key in SPOT_ICONS ? key : 'vagarbete';
}

export const MEETUP_VIBES = [
  {
    key: 'cruising',
    label: 'Cruising',
    hint: 'Runda genom stan',
    icon: duo(
      `<path d="M6 41 18 9h12l12 32z" fill="${BLUE}" fill-opacity=".45"/>`,
      `<path d="M6 41 18 9M42 41 30 9" stroke="${WHITE}" stroke-width="3" stroke-linecap="round"/><path d="M24 11v4M24 19v3" stroke="${BLUE_SOFT}" stroke-width="2.4" stroke-linecap="round"/><path d="M14.5 36v-4.5l2.6-6.5h13.8l2.6 6.5V36z" fill="${MAP_BG}" stroke="${WHITE}" stroke-width="2.8" stroke-linejoin="round"/><circle cx="19.5" cy="31.5" r="1.7" fill="${BLUE_SOFT}"/><circle cx="28.5" cy="31.5" r="1.7" fill="${BLUE_SOFT}"/>`,
    ),
  },
  {
    key: 'hang',
    label: 'Häng',
    hint: 'Stå och snacka EPA',
    icon: duo(
      `<circle cx="17" cy="16" r="7.5" fill="${BLUE}" fill-opacity=".5"/><circle cx="32" cy="17" r="6.5" fill="${BLUE}" fill-opacity=".5"/>`,
      `<circle cx="17" cy="16" r="6.5" stroke="${WHITE}" stroke-width="3"/><circle cx="32" cy="17" r="5.5" stroke="${WHITE}" stroke-width="3"/><path d="M5 41c1-7.5 5.8-12 12-12s11 4.5 12 12" stroke="${WHITE}" stroke-width="3" stroke-linecap="round"/><path d="M27 30.5c1.4-.9 3-1.4 5-1.4 5.3 0 9 3.7 10 10.4" stroke="${BLUE_SOFT}" stroke-width="3" stroke-linecap="round"/>`,
    ),
  },
  {
    key: 'fest',
    label: 'Fest',
    hint: 'Musik och folk',
    icon: duo(
      `<path d="M22 6l4.2 13.8L40 24l-13.8 4.2L22 42l-4.2-13.8L4 24l13.8-4.2z" fill="${BLUE}" fill-opacity=".5"/>`,
      `<path d="M22 6l4.2 13.8L40 24l-13.8 4.2L22 42l-4.2-13.8L4 24l13.8-4.2z" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round"/><path d="M38 5v8M34 9h8" stroke="${BLUE_SOFT}" stroke-width="2.6" stroke-linecap="round"/><circle cx="39" cy="38" r="2.4" fill="${BLUE_SOFT}"/>`,
    ),
  },
  {
    key: 'kak',
    label: 'Käk',
    hint: 'Burgare, pizza, kebab',
    icon: duo(
      `<rect x="6" y="23" width="36" height="8" rx="3" fill="${BLUE}" fill-opacity=".5"/>`,
      `<path d="M8 19a16 11 0 0 1 32 0z" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round"/><path d="M6 27h36" stroke="${WHITE}" stroke-width="3" stroke-linecap="round"/><path d="M8 33h32v2a5 5 0 0 1-5 5H13a5 5 0 0 1-5-5z" stroke="${WHITE}" stroke-width="3" stroke-linejoin="round"/><circle cx="18" cy="13" r="1.4" fill="${BLUE_SOFT}"/><circle cx="25" cy="11" r="1.4" fill="${BLUE_SOFT}"/><circle cx="31" cy="14" r="1.4" fill="${BLUE_SOFT}"/>`,
    ),
  },
] as const;

export type MeetupVibe = (typeof MEETUP_VIBES)[number]['key'];

export function meetupVibe(key: string | null | undefined) {
  return MEETUP_VIBES.find((vibe) => vibe.key === key) ?? MEETUP_VIBES[0];
}
