import { useContext, type ReactNode } from 'react';
import { KeyboardAvoidingView, type StyleProp, type ViewStyle } from 'react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';

type KeyboardAvoiderProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function KeyboardAvoider({ children, style }: KeyboardAvoiderProps) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;

  return (
    <KeyboardAvoidingView style={style} behavior="padding" keyboardVerticalOffset={headerHeight}>
      {children}
    </KeyboardAvoidingView>
  );
}
