import { FontFamilies } from './fonts';

const inter = FontFamilies.inter;

export const Typography = {
  title: { fontSize: 30, lineHeight: 36, fontFamily: inter.extraBold, letterSpacing: -0.6 },
  display: { fontSize: 28, lineHeight: 34 },
  subtitle: { fontSize: 22, lineHeight: 28, fontFamily: inter.bold, letterSpacing: -0.3 },
  lead: { fontSize: 18, lineHeight: 26, fontFamily: inter.regular },
  headline: { fontSize: 17, lineHeight: 22, fontFamily: inter.semiBold, letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22, fontFamily: inter.regular },
  input: { fontSize: 16, fontFamily: inter.regular },
  button: { fontSize: 16, fontFamily: inter.bold },
  buttonSmall: { fontSize: 14, fontFamily: inter.semiBold },
  small: { fontSize: 14, lineHeight: 20, fontFamily: inter.medium },
  smallBold: { fontSize: 14, lineHeight: 20, fontFamily: inter.semiBold },
  link: { fontSize: 14, lineHeight: 30, fontFamily: inter.medium },
  linkPrimary: { fontSize: 14, lineHeight: 30, fontFamily: inter.semiBold },
  error: { fontSize: 13, lineHeight: 18, fontFamily: inter.medium },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: inter.semiBold },
  tabLabel: { fontSize: 11, lineHeight: 14 },
  badge: { fontSize: 10, lineHeight: 12 },
  emoji: { fontSize: 26, lineHeight: 32 },
} as const;
