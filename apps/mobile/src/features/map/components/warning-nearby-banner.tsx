import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { roundedDistance, type NearbyWarning } from '@/features/map/use-nearby-warning';
import { useWarningVote, WarningVoteButtons } from '@/features/map/warning-votes';
import { useTheme } from '@/hooks/use-theme';
import { pressHaptic } from '@/lib/haptics';

const AUTO_HIDE_MS = 20000;

type WarningNearbyBannerProps = {
  warning: NearbyWarning;
  top: number;
  onClose: () => void;
};

export function WarningNearbyBanner({ warning, top, onClose }: WarningNearbyBannerProps) {
  const theme = useTheme();
  const { votes, vote } = useWarningVote(warning.id, onClose);

  useEffect(() => {
    pressHaptic();
    const timer = setTimeout(onClose, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [warning.id, onClose]);

  const where = `${roundedDistance(warning.meters)} m ${warning.ahead ? 'fram' : 'bort'}`;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        {
          top,
          backgroundColor: theme.backgroundElement,
          borderColor: theme.warning,
        },
      ]}
    >
      <View style={styles.head}>
        <Ionicons name="warning" size={20} color={theme.warning} />
        <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
          {`Varning: ${warning.title} ${where}`}
        </ThemedText>
        <IconButton
          icon="close"
          variant="plain"
          size={18}
          accessibilityLabel={Common.close}
          onPress={onClose}
        />
      </View>
      <WarningVoteButtons
        myVote={votes?.myVote}
        busy={vote.isPending}
        onVote={(gone) => vote.mutate(gone)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1 },
});
