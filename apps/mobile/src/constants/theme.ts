import '@/global.css';

import { Platform } from 'react-native';

import { Colors } from '@eparadar/theme/colors';
import { FontFamilies } from '@eparadar/theme/fonts';
import { Spacing } from '@eparadar/theme/spacing';

export { Colors, Spacing };

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  inter: FontFamilies.inter,
  mono: Platform.select({
    ios: 'Menlo',
    web: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    default: 'monospace',
  }),
} as const;
