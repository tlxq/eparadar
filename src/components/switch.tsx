import { Switch as RNSwitch, type SwitchProps as RNSwitchProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type SwitchProps = Omit<RNSwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>;

export function Switch(props: SwitchProps) {
  const theme = useTheme();

  return (
    <RNSwitch
      trackColor={{ false: theme.backgroundElement, true: theme.brand }}
      thumbColor={theme.background}
      ios_backgroundColor={theme.backgroundElement}
      {...props}
    />
  );
}
