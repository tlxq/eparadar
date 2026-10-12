import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { setMapStatus, STATUS_MAX_LENGTH, STATUS_PRESETS } from '@/features/map/status';
import { getErrorMessage } from '@/lib/errors';
import { FormSheet } from '@/components/form-sheet';
import { Chip } from '@/components/chip';
import { Common } from '@/constants/strings';

type StatusSheetProps = {
  userId: string;
  current: string | null;
  ghost: boolean;
  onClose: () => void;
  onSaved: (text: string | null) => void;
};

export function StatusSheet({ userId, current, ghost, onClose, onSaved }: StatusSheetProps) {
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
    <FormSheet
      title="Din status"
      onClose={onClose}
      action={{
        label: Common.save,
        onPress: () => save(text),
        loading: saving,
        disabled: ghost || !text.trim(),
      }}
    >
      {ghost ? (
        <ThemedText type="smallBold" themeColor="textSecondary">
          Stäng av spökläge först. Ingen ser din status när du är osynlig.
        </ThemedText>
      ) : null}
      <View
        style={[styles.chips, ghost && styles.off]}
        pointerEvents={ghost ? 'none' : 'auto'}
        accessibilityElementsHidden={ghost}
        importantForAccessibility={ghost ? 'no-hide-descendants' : 'auto'}
      >
        {STATUS_PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={preset}
            selected={preset === text.trim()}
            onPress={() => setText(preset)}
          />
        ))}
      </View>
      <TextField
        label="Eller skriv själv"
        placeholder="Kör till sjön"
        value={text}
        onChangeText={setText}
        maxLength={STATUS_MAX_LENGTH}
        editable={!ghost}
        style={ghost ? styles.off : undefined}
        hint={ghost ? 'Stäng av spökläge först' : `${text.length}/${STATUS_MAX_LENGTH} tecken`}
        error={error}
      />
      <ThemedText type="caption" themeColor="textSecondary">
        Syns i en bubbla vid din avatar för kompisar som ser dig på kartan. Försvinner efter en
        timme.
      </ThemedText>
      {current ? (
        <Button
          label="Ta bort status"
          variant="ghost"
          disabled={saving}
          onPress={() => save(null)}
        />
      ) : null}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  off: { opacity: 0.4 },
});
