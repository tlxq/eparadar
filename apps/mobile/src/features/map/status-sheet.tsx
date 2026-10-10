import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { setMapStatus, STATUS_MAX_LENGTH, STATUS_PRESETS } from '@/features/map/status';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';

type StatusSheetProps = {
  userId: string;
  current: string | null;
  onClose: () => void;
  onSaved: (text: string | null) => void;
};

export function StatusSheet({ userId, current, onClose, onSaved }: StatusSheetProps) {
  const theme = useTheme();
  const [text, setText] = useState(current ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: string | null) {
    setSaving(true);
    setError(null);
    try {
      await setMapStatus(userId, value);
      onSaved(value?.trim() ? value.trim() : null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.sheet, { backgroundColor: theme.background }]}
          edges={['top', 'bottom']}
        >
          <KeyboardAvoider style={styles.sheet}>
            <View style={styles.header}>
              <Button label="Avbryt" variant="ghost" size="sm" onPress={onClose} />
              <ThemedText type="headline">Din status</ThemedText>
              <Button
                label="Spara"
                size="sm"
                loading={saving}
                disabled={!text.trim()}
                onPress={() => save(text)}
              />
            </View>
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              <View style={styles.chips}>
                {STATUS_PRESETS.map((preset) => {
                  const selected = preset === text.trim();
                  return (
                    <Pressable
                      key={preset}
                      accessibilityRole="button"
                      onPress={() => setText(preset)}
                      style={[
                        styles.chip,
                        { backgroundColor: selected ? theme.brand : theme.backgroundElement },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={selected ? { color: theme.brandText } : undefined}
                      >
                        {preset}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <TextField
                label="Eller skriv själv"
                placeholder="Kör till sjön"
                value={text}
                onChangeText={setText}
                maxLength={STATUS_MAX_LENGTH}
                error={error}
              />
              <ThemedText type="caption" themeColor="textSecondary">
                Syns i en bubbla vid din avatar för vänner som ser dig på kartan. Försvinner efter
                en timme.
              </ThemedText>
              {current ? (
                <Button
                  label="Ta bort status"
                  variant="ghost"
                  disabled={saving}
                  onPress={() => save(null)}
                />
              ) : null}
            </ScrollView>
          </KeyboardAvoider>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  body: { padding: Spacing.three, gap: Spacing.three },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: 999 },
});
