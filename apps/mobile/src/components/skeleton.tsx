import { useEffect, useState } from 'react';
import { Animated, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height = 12, radius = Radius.sm, style }: SkeletonProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.backgroundSelected, opacity },
        style,
      ]}
    />
  );
}
