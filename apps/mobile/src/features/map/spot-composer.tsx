import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import { Button } from '@/components/button';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { SPOT_ICONS } from '@/features/map/map-icons';
import {
  createSpot,
  WARNING_TYPES,
  type SpotKind,
  type SpotVisibility,
  type WarningType,
} from '@/features/map/spots';
import { useTheme } from '@/hooks/use-theme';
import { getErrorMessage } from '@/lib/errors';

type SpotComposerProps = {
  at: { lat: number; lng: number };
  creatorId: string;
  initialKind: SpotKind;
  onClose: () => void;
  onCreated: (kind: SpotKind) => void;
};

const VISIBILITY: { key: SpotVisibility; label: string; hint: string }[] = [
  { key: 'friends', label: 'Mina vänner', hint: 'Bara dina vänner ser den.' },
  { key: 'all', label: 'Alla i appen', hint: 'Alla på epaRadar ser den, utom de du blockat.' },
];

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
  const [visibility, setVisibility] = useState<SpotVisibility>('friends');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameMissing = kind === 'ragg' && !name.trim();

  async function handleSubmit() {
    if (nameMissing) {
      setError('Ge stället ett namn, t.ex. Max-rondellen.');
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
        visibility,
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
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.sheet, { backgroundColor: theme.background }]}
          edges={['top', 'bottom']}
        >
          <KeyboardAvoider style={styles.sheet}>
            <View style={styles.header}>
              <Button label="Avbryt" variant="ghost" size="sm" onPress={onClose} />
              <ThemedText type="headline">Släpp spot</ThemedText>
              <View style={styles.headerSpacer} />
            </View>
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              <View style={styles.kinds}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: kind === 'ragg' }}
                  onPress={() => setKind('ragg')}
                  style={option(kind === 'ragg')}
                >
                  <SvgXml xml={SPOT_ICONS.ragg} width={32} height={32} />
                  <View style={styles.optionText}>
                    <ThemedText type="smallBold">Raggställe</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      Ligger kvar och samlar gänget
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
                    <ThemedText type="smallBold">Varning</ThemedText>
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
                  onChangeText={setName}
                  maxLength={40}
                  autoFocus
                  error={error}
                />
              ) : (
                <View style={styles.section}>
                  <ThemedText type="smallBold">Vad är det?</ThemedText>
                  <View style={styles.chips}>
                    {WARNING_TYPES.map((warning) => {
                      const selected = warning.key === warningType;
                      return (
                        <Pressable
                          key={warning.key}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          onPress={() => setWarningType(warning.key)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected ? theme.accent : theme.backgroundElement,
                            },
                          ]}
                        >
                          <SvgXml xml={SPOT_ICONS[warning.key]} width={22} height={22} />
                          <ThemedText
                            type="smallBold"
                            style={selected ? { color: theme.onAccent } : undefined}
                          >
                            {warning.label}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  {error ? <ThemedText type="error">{error}</ThemedText> : null}
                </View>
              )}

              <View style={styles.section}>
                <ThemedText type="smallBold">Vem ser den?</ThemedText>
                <View style={styles.segment}>
                  {VISIBILITY.map((item) => {
                    const selected = item.key === visibility;
                    return (
                      <Pressable
                        key={item.key}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() => setVisibility(item.key)}
                        style={[
                          styles.segmentItem,
                          {
                            backgroundColor: selected ? theme.brand : theme.backgroundElement,
                          },
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={selected ? { color: theme.brandText } : undefined}
                        >
                          {item.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                  {VISIBILITY.find((item) => item.key === visibility)?.hint}
                </ThemedText>
              </View>

              <Button
                label={kind === 'ragg' ? 'Släpp raggställe' : 'Släpp varning'}
                onPress={handleSubmit}
                loading={saving}
                disabled={nameMissing}
              />
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
  headerSpacer: { width: 72 },
  body: { padding: Spacing.three, gap: Spacing.four },
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
  },
  segment: { flexDirection: 'row', gap: Spacing.two },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
  },
});
