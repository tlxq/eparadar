import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
};

export function TextField({ style, label, error, onFocus, onBlur, ...props }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.danger : focused ? theme.brand : theme.border;

  const input = (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      accessibilityLabel={label ?? props.accessibilityLabel ?? props.placeholder}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.input,
        props.multiline && styles.multiline,
        { backgroundColor: theme.backgroundElement, borderColor, color: theme.text },
        style,
      ]}
      {...props}
    />
  );

  if (!label && !error) return input;

  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      {input}
      {error ? (
        <View style={styles.error}>
          <Ionicons name="alert-circle" size={14} color={theme.danger} />
          <ThemedText type="error" style={styles.errorText}>
            {error}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one + Spacing.half },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    fontSize: 16,
    fontFamily: Fonts.inter.regular,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  error: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  errorText: { flex: 1 },
});
