import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const FADE_MS = 160;

type HeaderBarProps = {
  title?: string;
  subtitle?: string;
  titleVisible?: boolean;
  titleLeading?: ReactNode;
  onTitlePress?: () => void;
  titleHint?: string;
  left?: ReactNode;
  right?: ReactNode;
};

export function HeaderBar({
  title,
  subtitle,
  titleVisible = true,
  titleLeading,
  onTitlePress,
  titleHint,
  left,
  right,
}: HeaderBarProps) {
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(titleVisible ? 1 : 0));

  useEffect(() => {
    if (reduced) {
      opacity.setValue(titleVisible ? 1 : 0);
      return;
    }
    Animated.timing(opacity, {
      toValue: titleVisible ? 1 : 0,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [titleVisible, reduced, opacity]);

  const text = (
    <View style={styles.titleRow}>
      {titleLeading}
      <View style={styles.titleText}>
        <ThemedText type="headline" accessibilityRole="header" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.bar}>
      <View style={[styles.side, styles.start]}>{left}</View>
      {title ? (
        <Animated.View
          style={[styles.center, { opacity }]}
          pointerEvents={titleVisible ? 'auto' : 'none'}
          accessibilityElementsHidden={!titleVisible}
          importantForAccessibility={titleVisible ? 'auto' : 'no-hide-descendants'}
        >
          {onTitlePress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityHint={titleHint}
              onPress={onTitlePress}
              style={({ pressed }) => pressed && styles.pressed}
            >
              {text}
            </Pressable>
          ) : (
            text
          )}
        </Animated.View>
      ) : null}
      <View style={[styles.side, styles.end]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  start: { justifyContent: 'flex-start' },
  end: { justifyContent: 'flex-end' },
  center: { flexShrink: 1, maxWidth: '60%', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  titleText: { flexShrink: 1, alignItems: 'center' },
  pressed: { opacity: 0.7 },
});
