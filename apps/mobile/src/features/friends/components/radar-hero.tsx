import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const BLIP_POSITIONS = [
  { top: '28%', left: '62%' },
  { top: '58%', left: '22%' },
  { top: '70%', left: '68%' },
  { top: '40%', left: '40%' },
] as const;

type RadarHeroProps = {
  size?: number;
  blipCount?: number;
};

export function RadarHero({ size = 176, blipCount = 0 }: RadarHeroProps) {
  const theme = useTheme();
  const [sweep] = useState(() => new Animated.Value(0));
  const [ringA] = useState(() => new Animated.Value(0));
  const [ringB] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const sweepLoop = Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }),
    );
    const ringALoop = Animated.loop(
      Animated.timing(ringA, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    const ringBLoop = Animated.loop(
      Animated.timing(ringB, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );

    sweepLoop.start();
    ringALoop.start();
    const ringBTimeout = setTimeout(() => ringBLoop.start(), 1200);

    return () => {
      sweepLoop.stop();
      ringALoop.stop();
      ringBLoop.stop();
      clearTimeout(ringBTimeout);
    };
  }, [sweep, ringA, ringB]);

  const rotate = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ringAScale = ringA.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.4] });
  const ringAOpacity = ringA.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });
  const ringBScale = ringB.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.4] });
  const ringBOpacity = ringB.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[
          styles.ring,
          { borderColor: theme.brand, transform: [{ scale: ringAScale }], opacity: ringAOpacity },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.ring,
          { borderColor: theme.brand, transform: [{ scale: ringBScale }], opacity: ringBOpacity },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.disc,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.backgroundElement },
        ]}
      >
        <Animated.View
          style={[
            styles.sweepWrap,
            { width: size * 1.6, height: size * 1.6, left: -size * 0.3, top: -size * 0.3 },
            { transform: [{ rotate }] },
          ]}
        >
          <LinearGradient
            colors={['rgba(47,111,237,0)', 'rgba(47,111,237,0.5)']}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {BLIP_POSITIONS.slice(0, blipCount).map((position, index) => (
          <View
            key={index}
            style={[styles.blip, { backgroundColor: theme.brandOnSurface, top: position.top, left: position.left }]}
          />
        ))}
      </View>
      <View style={[styles.center, { backgroundColor: theme.brand }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { overflow: 'hidden', position: 'relative' },
  sweepWrap: { position: 'absolute' },
  ring: {
    position: 'absolute',
    top: -14,
    left: -14,
    right: -14,
    bottom: -14,
    borderWidth: 2,
    borderRadius: 999,
  },
  blip: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  center: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 12,
    height: 12,
    marginTop: -6,
    marginLeft: -6,
    borderRadius: 6,
  },
});
