import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AuthTopBarProps = {
  onBack: () => void;
  step?: number;
  total?: number;
};

export function AuthTopBar({ onBack, step, total }: AuthTopBarProps) {
  const theme = useTheme();
  const showSteps = step !== undefined && total !== undefined;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <IconButton icon="arrow-back" accessibilityLabel={Common.back} onPress={onBack} />
        {showSteps ? (
          <ThemedText type="smallBold" themeColor="textSecondary">
            Steg {step} av {total}
          </ThemedText>
        ) : null}
      </View>
      {showSteps ? (
        <View
          style={styles.bar}
          accessibilityRole="progressbar"
          accessibilityLabel={`Steg ${step} av ${total}`}
          accessibilityValue={{ min: 1, max: total, now: step }}
        >
          {Array.from({ length: total }, (_, index) => (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  backgroundColor: index < step ? theme.brand : theme.backgroundSelected,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bar: { flexDirection: 'row', gap: Spacing.one },
  segment: { flex: 1, height: 4, borderRadius: Radius.pill },
});
