import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Common } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MapBannerProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
};

export function MapBanner({
  icon,
  iconColor,
  title,
  message,
  actionLabel,
  onAction,
  onClose,
}: MapBannerProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}
    >
      <Ionicons name={icon} size={22} color={iconColor ?? theme.brand} style={styles.icon} />
      <View style={styles.body}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
        {actionLabel && onAction ? (
          <View style={styles.action}>
            <Button label={actionLabel} size="sm" onPress={onAction} />
          </View>
        ) : null}
      </View>
      {onClose ? (
        <IconButton
          icon="close"
          variant="plain"
          size={20}
          accessibilityLabel={Common.close}
          onPress={onClose}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  icon: { marginTop: Spacing.half },
  body: { flex: 1, gap: Spacing.one },
  action: { alignSelf: 'flex-start', marginTop: Spacing.two },
});
