import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function ScreenBackground({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={[theme.gradientTop, theme.background]}
      style={[styles.fill, style]}
      {...rest}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
