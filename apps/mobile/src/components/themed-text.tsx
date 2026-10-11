import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'subtitle'
    | 'headline'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'link'
    | 'linkPrimary'
    | 'error'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  const colorOverride: Partial<Record<NonNullable<ThemedTextProps['type']>, ThemeColor>> = {
    linkPrimary: 'brandOnSurface',
    error: 'danger',
  };
  const resolvedColor = themeColor ?? colorOverride[type] ?? 'text';

  return <Text style={[{ color: theme[resolvedColor] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 22, fontFamily: Fonts.inter.regular },
  title: { fontSize: 30, lineHeight: 36, fontFamily: Fonts.inter.extraBold, letterSpacing: -0.6 },
  subtitle: { fontSize: 22, lineHeight: 28, fontFamily: Fonts.inter.bold, letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontFamily: Fonts.inter.semiBold, letterSpacing: -0.2 },
  small: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.inter.medium },
  smallBold: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.inter.semiBold },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.inter.semiBold },
  link: { fontSize: 14, lineHeight: 30, fontFamily: Fonts.inter.medium },
  linkPrimary: { fontSize: 14, lineHeight: 30, fontFamily: Fonts.inter.semiBold },
  error: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.inter.medium },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
