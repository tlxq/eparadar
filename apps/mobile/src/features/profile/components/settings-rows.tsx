import { Children, Fragment, type ComponentProps, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/skeleton';
import { Switch } from '@/components/switch';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function SettingsGroup({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <View style={[styles.separator, { backgroundColor: theme.separator }]} />
          ) : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type SwitchRowProps = {
  title: string;
  hint: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
  dimmed?: boolean;
  testID?: string;
};

export function SwitchRow({
  title,
  hint,
  value,
  onValueChange,
  loading,
  disabled,
  dimmed,
  testID,
}: SwitchRowProps) {
  return (
    <View style={[styles.row, dimmed && !loading && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <ThemedText type="headline">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      </View>
      {loading ? (
        <Skeleton width={52} height={32} radius={Radius.pill} />
      ) : (
        <Switch
          testID={testID}
          accessibilityLabel={title}
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
        />
      )}
    </View>
  );
}

type LinkRowProps = {
  label: string;
  icon: IconName;
  onPress: () => void;
  role?: 'link' | 'button';
  danger?: boolean;
  chevron?: boolean;
  busy?: boolean;
};

export function LinkRow({
  label,
  icon,
  onPress,
  role = 'link',
  danger,
  chevron,
  busy,
}: LinkRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={busy ? { busy } : undefined}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkRow,
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}
    >
      <Ionicons name={icon} size={22} color={danger ? theme.danger : theme.brandOnSurface} />
      <ThemedText type="headline" themeColor={danger ? 'danger' : undefined} style={styles.rowText}>
        {label}
      </ThemedText>
      {chevron ? <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /> : null}
    </Pressable>
  );
}

export function InfoRow({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  const theme = useTheme();
  return (
    <View style={styles.linkRow} accessible accessibilityLabel={`${label} ${value}`}>
      <Ionicons name={icon} size={22} color={theme.brandOnSurface} />
      <ThemedText type="headline" style={styles.rowText}>
        {label}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: Radius.lg, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowText: { flex: 1, gap: Spacing.half },
  rowDisabled: { opacity: 0.55 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
});
