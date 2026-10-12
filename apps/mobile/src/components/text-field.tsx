import { useState, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  trailing?: ReactNode;
};

export function TextField({
  style,
  label,
  error,
  hint,
  trailing,
  onFocus,
  onBlur,
  ...props
}: TextFieldProps) {
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
        trailing ? styles.withTrailing : null,
        { backgroundColor: theme.backgroundElement, borderColor, color: theme.text },
        style,
      ]}
      {...props}
    />
  );

  const field = trailing ? (
    <View>
      {input}
      <View style={styles.trailing}>{trailing}</View>
    </View>
  ) : (
    input
  );

  if (!label && !error && !hint) return field;

  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      {field}
      {hint && !error ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
      {error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
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
    ...Typography.input,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  withTrailing: { paddingRight: 52 },
  trailing: {
    position: 'absolute',
    right: Spacing.one,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  error: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  errorText: { flex: 1 },
});
