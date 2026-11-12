import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ThemedTextProps = TextProps & {
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
    | 'code'
    | 'codeDigit';
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
  default: Typography.body,
  title: Typography.title,
  subtitle: Typography.subtitle,
  headline: Typography.headline,
  small: Typography.small,
  smallBold: Typography.smallBold,
  caption: Typography.caption,
  link: Typography.link,
  linkPrimary: Typography.linkPrimary,
  error: Typography.error,
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
  codeDigit: {
    ...Typography.codeDigit,
    fontFamily: Fonts.mono,
    fontWeight: '700',
  },
});
