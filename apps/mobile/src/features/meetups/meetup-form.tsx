import { useMemo, useState, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { router } from 'expo-router';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Common, Days, sentenceStart } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { MEETUP_VIBES, type MeetupVibe } from '@/features/map/map-icons';
import { TimePickerSheet } from '@/features/meetups/time-picker-sheet';
import {
  exactTimeText,
  isPickableTime,
  quickTimeToDate,
  type QuickTimeOption,
} from '@/features/meetups/time';
import { useTheme } from '@/hooks/use-theme';

const TIME_OPTIONS: { value: QuickTimeOption; label: string }[] = [
  { value: 'tonight', label: sentenceStart(Days.tonight) },
  { value: 'tomorrow', label: sentenceStart(Days.tomorrow) },
  { value: 'weekend', label: 'Helgen' },
];

const DESCRIPTION_MAX = 300;

type MeetupFormValues = {
  vibe: MeetupVibe;
  title: string;
  description: string;
  startsAt: Date;
};

type TimeChoice = QuickTimeOption | 'custom';

type MeetupFormProps = {
  heading: string;
  submitLabel: string;
  submitIcon: 'location' | 'checkmark';
  pending: boolean;
  initial?: MeetupFormValues;
  extra?: ReactNode;
  onSubmit: (values: MeetupFormValues) => void;
};

function firstQuickTime(now: Date): { choice: TimeChoice; date: Date } {
  for (const option of TIME_OPTIONS) {
    const date = quickTimeToDate(option.value, now);
    if (date) return { choice: option.value, date };
  }
  return { choice: 'custom', date: new Date(now.getTime() + 3_600_000) };
}

export function MeetupForm({
  heading,
  submitLabel,
  submitIcon,
  pending,
  initial,
  extra,
  onSubmit,
}: MeetupFormProps) {
  const theme = useTheme();
  const now = useMemo(() => new Date(), []);
  const quickTimes = useMemo(
    () =>
      TIME_OPTIONS.map((option) => ({
        ...option,
        date: quickTimeToDate(option.value, now),
      })).filter((option): option is typeof option & { date: Date } => option.date !== null),
    [now],
  );

  const [vibe, setVibe] = useState<MeetupVibe>(initial?.vibe ?? 'cruising');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [time, setTime] = useState<{ choice: TimeChoice; date: Date }>(() =>
    initial ? { choice: 'custom', date: initial.startsAt } : firstQuickTime(now),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!title.trim()) {
      setTitleError('Ge träffen ett namn först.');
      return;
    }
    const timeChanged = !initial || time.date.getTime() !== initial.startsAt.getTime();
    if (timeChanged && !isPickableTime(time.date)) {
      setTimeError('Den tiden har redan varit. Välj en ny.');
      return;
    }
    onSubmit({ vibe, title: title.trim(), description: description.trim(), startsAt: time.date });
  };

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoider style={styles.container}>
          <View style={styles.header}>
            <Button label={Common.cancel} variant="ghost" size="sm" onPress={() => router.back()} />
            <ThemedText type="headline">{heading}</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <ThemedText type="smallBold">Vad blir det?</ThemedText>
              <View style={styles.vibeGrid} accessibilityRole="radiogroup">
                {MEETUP_VIBES.map((item) => {
                  const selected = item.key === vibe;
                  return (
                    <Pressable
                      key={item.key}
                      accessibilityRole="radio"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected }}
                      onPress={() => setVibe(item.key)}
                      style={[
                        styles.vibeTile,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: selected ? theme.brand : 'transparent',
                        },
                      ]}
                    >
                      <SvgXml xml={item.icon} width={36} height={36} />
                      <View style={styles.vibeText}>
                        <ThemedText type="smallBold">{item.label}</ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                          {item.hint}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <TextField
              label="Namn på träffen"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (titleError) setTitleError(null);
              }}
              placeholder='T.ex. "Cruising vid torget"'
              maxLength={60}
              error={titleError}
            />

            <View style={styles.section}>
              <ThemedText type="smallBold">När?</ThemedText>
              <View style={styles.timeRow} accessibilityRole="radiogroup">
                {quickTimes.map((option) => (
                  <Chip
                    key={option.value}
                    role="radio"
                    label={option.label}
                    selected={time.choice === option.value}
                    onPress={() => {
                      setTimeError(null);
                      setTime({ choice: option.value, date: option.date });
                    }}
                  />
                ))}
                <Chip
                  role="radio"
                  label="Välj tid"
                  selected={time.choice === 'custom'}
                  leading={(_, color) => <Ionicons name="time-outline" size={16} color={color} />}
                  onPress={() => setPickerOpen(true)}
                />
              </View>
              <ThemedText
                type="smallBold"
                themeColor={timeError ? 'danger' : 'textSecondary'}
                accessibilityLiveRegion="polite"
              >
                {timeError ?? exactTimeText(time.date)}
              </ThemedText>
            </View>

            <TextField
              label="Beskrivning (valfritt)"
              value={description}
              onChangeText={setDescription}
              placeholder="Vad händer, vem är välkommen?"
              maxLength={DESCRIPTION_MAX}
              multiline
              hint={`${description.length}/${DESCRIPTION_MAX}`}
            />

            {extra}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.separator }]}>
            <Button
              label={submitLabel}
              icon={submitIcon}
              onPress={handleSubmit}
              loading={pending}
            />
          </View>
        </KeyboardAvoider>
      </SafeAreaView>
      {pickerOpen ? (
        <TimePickerSheet
          value={time.date}
          onClose={() => setPickerOpen(false)}
          onPick={(date) => {
            setPickerOpen(false);
            setTimeError(null);
            setTime({ choice: 'custom', date });
          }}
        />
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerSpacer: { width: 72 },
  body: { padding: Spacing.three, gap: Spacing.four },
  section: { gap: Spacing.two },
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  vibeTile: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  vibeText: { flex: 1, gap: 2 },
  timeRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
