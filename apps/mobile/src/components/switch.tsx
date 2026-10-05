import { Switch as RNSwitch, type SwitchProps as RNSwitchProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type SwitchProps = Omit<RNSwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>;

export function Switch(props: SwitchProps) {
  const theme = useTheme();

  return (
    <RNSwitch
      trackColor={{ false: theme.border, true: theme.brand }}
      thumbColor={theme.brandText}
      ios_backgroundColor={theme.border}
      {...props}
    />
  );
}
