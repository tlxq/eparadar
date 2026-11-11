import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Common, Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PlacingControlsProps = {
  step: 'placing' | 'confirming';
  bottom: number;
  moving?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PlacingControls({
  step,
  bottom,
  moving,
  onCancel,
  onConfirm,
}: PlacingControlsProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      <View
        style={[
          styles.hint,
          { top: insets.top + Spacing.three, backgroundColor: theme.backgroundElement },
        ]}
      >
        <ThemedText type="smallBold">
          {step === 'placing'
            ? 'Tryck där träffen ska vara'
            : moving
              ? 'Dra pinnen dit träffen ska flytta'
              : 'Dra pinnen för att justera'}
        </ThemedText>
      </View>
      <View style={[styles.bar, { bottom }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={[styles.button, { backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText type="smallBold" themeColor="textSecondary">
            {Common.cancel}
          </ThemedText>
        </Pressable>
        {step === 'confirming' && (
          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={[styles.button, styles.primary, { backgroundColor: theme.brand }]}
          >
            <ThemedText type="smallBold" style={{ color: theme.brandText }}>
              {moving ? 'Flytta hit' : `${Words.place} här`}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  bar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  primary: { flex: 2 },
});
