import type { ReactNode } from 'react';
import { KeyboardAvoidingView, type StyleProp, type ViewStyle } from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';

type KeyboardAvoiderProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function KeyboardAvoider({ children, style }: KeyboardAvoiderProps) {
  const headerHeight = useHeaderHeight();

  return (
    <KeyboardAvoidingView style={style} behavior="padding" keyboardVerticalOffset={headerHeight}>
      {children}
    </KeyboardAvoidingView>
  );
}
