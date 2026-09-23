import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function ScreenBackground({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();

  const gradientProps = {
    colors: [theme.gradientTop, theme.background],
    style: [styles.fill, style],
    ...rest,
  } as ComponentProps<typeof LinearGradient>;

  return <LinearGradient {...gradientProps}>{children}</LinearGradient>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
