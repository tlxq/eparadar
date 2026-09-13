import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#FFFFFF',
    gradientTop: '#F6F8FC',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E4E6EC',
    border: '#7B8291',
    text: '#10131A',
    textSecondary: '#5B6472',
    brand: '#2F6FED',
    brandOnSurface: '#1B54D6',
    brandText: '#FFFFFF',
    accent: '#C15A1A',
    success: '#16A34A',
    danger: '#C22F35',
  },
  dark: {
    background: '#0B0E14',
    gradientTop: '#151B28',
    backgroundElement: '#171B23',
    backgroundSelected: '#232833',
    border: '#67738A',
    text: '#F4F6F9',
    textSecondary: '#A2AAB8',
    brand: '#2F6FED',
    brandOnSurface: '#7EA6FF',
    brandText: '#FFFFFF',
    accent: '#FF8A3D',
    success: '#22C55E',
    danger: '#FF6B6B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  mono: Platform.select({
    ios: 'Menlo',
    web: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    default: 'monospace',
  }),
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
