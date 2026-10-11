import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { TAB_BAR_HEIGHT, useTabBarOffset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const bottom = useTabBarOffset();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { bottom, backgroundColor: theme.tabBar, borderColor: theme.separator }]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? theme.brandOnSurface : theme.textSecondary;
        const label = typeof options.title === 'string' ? options.title : route.name;
        const badge = options.tabBarBadge;

        function onPress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={badge ? `${label}, ${badge} nya` : label}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={[styles.pill, focused && { backgroundColor: `${theme.brand}29` }]}>
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              {badge !== undefined ? (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.accent, borderColor: theme.background },
                  ]}
                >
                  <ThemedText type="caption" style={[styles.badgeText, { color: theme.onAccent }]}>
                    {badge}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText type="caption" style={[styles.label, { color }]} numberOfLines={1}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    height: TAB_BAR_HEIGHT,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    height: '100%',
  },
  pressed: { opacity: 0.7 },
  pill: {
    width: 52,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: Typography.tabLabel,
  badge: {
    position: 'absolute',
    top: -4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: Spacing.one,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: Typography.badge,
});
