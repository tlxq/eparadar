import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { SPOT_ICONS } from '@/features/map/map-icons';
import { createSpot, WARNING_TYPES, type SpotKind, type WarningType } from '@/features/map/spots';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';
import { FormSheet } from '@/components/form-sheet';
import { Chip } from '@/components/chip';

type SpotComposerProps = {
  at: { lat: number; lng: number };
  creatorId: string;
  initialKind: SpotKind;
  onClose: () => void;
  onCreated: (kind: SpotKind) => void;
};

export function SpotComposer({
  at,
  creatorId,
  initialKind,
  onClose,
  onCreated,
}: SpotComposerProps) {
  const theme = useTheme();
  const [kind, setKind] = useState<SpotKind>(initialKind);
  const [name, setName] = useState('');
  const [warningType, setWarningType] = useState<WarningType>('vagarbete');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameMissing = kind === 'ragg' && !name.trim();

  async function handleSubmit() {
    if (nameMissing) {
      setError('Ge spotten ett namn, t.ex. Max-rondellen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createSpot({
        creatorId,
        kind,
        lat: at.lat,
        lng: at.lng,
        name: kind === 'ragg' ? name : undefined,
        warningType: kind === 'varning' ? warningType : undefined,
      });
      onCreated(kind);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const option = (selected: boolean) => [
    styles.option,
    {
      backgroundColor: theme.backgroundElement,
      borderColor: selected ? theme.brand : 'transparent',
    },
  ];

  return (
    <FormSheet title="Placera spot" onClose={onClose} gap="four">
      <View style={styles.kinds}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: kind === 'ragg' }}
          onPress={() => setKind('ragg')}
          style={option(kind === 'ragg')}
        >
          <SvgXml xml={SPOT_ICONS.ragg} width={32} height={32} />
          <View style={styles.optionText}>
            <ThemedText type="smallBold">{Words.ragga}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Ligger kvar i 24 timmar
            </ThemedText>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: kind === 'varning' }}
          onPress={() => setKind('varning')}
          style={option(kind === 'varning')}
        >
          <SvgXml xml={SPOT_ICONS.vagarbete} width={32} height={32} />
          <View style={styles.optionText}>
            <ThemedText type="smallBold">{Words.warning}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Försvinner efter 2 timmar
            </ThemedText>
          </View>
        </Pressable>
      </View>

      {kind === 'ragg' ? (
        <TextField
          label="Namn"
          placeholder="Max-rondellen"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (error) setError(null);
          }}
          maxLength={40}
          autoFocus
          error={error}
        />
      ) : (
        <View style={styles.section}>
          <ThemedText type="smallBold">Vad är det?</ThemedText>
          <View style={styles.chips}>
            {WARNING_TYPES.map((warning) => (
              <Chip
                key={warning.key}
                label={warning.label}
                selected={warning.key === warningType}
                onPress={() => setWarningType(warning.key)}
                tone="accent"
                role="radio"
                leading={<SvgXml xml={SPOT_ICONS[warning.key]} width={22} height={22} />}
              />
            ))}
          </View>
          {error ? <ThemedText type="error">{error}</ThemedText> : null}
        </View>
      )}

      <ThemedText type="caption" themeColor="textSecondary">
        Bara dina kompisar ser den. Du kan ta bort den när du vill.
      </ThemedText>

      <Button label={Words.place} onPress={handleSubmit} loading={saving} />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  kinds: { gap: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  optionText: { flex: 1, gap: 2 },
  section: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
