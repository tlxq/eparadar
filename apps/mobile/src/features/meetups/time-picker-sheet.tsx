import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/chip';
import { FormSheet } from '@/components/form-sheet';
import { IconButton } from '@/components/icon-button';
import { SectionLabel } from '@/components/section-label';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { clockText, exactTimeText, isPickableTime, shortDayText } from '@/features/meetups/time';

const DAYS_SHOWN = 14;
const MINUTES = [0, 15, 30, 45];

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function dayChipLabel(day: Date, today: Date): string {
  const diff = Math.round((startOfDay(day).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Idag';
  if (diff === 1) return 'I morgon';
  return shortDayText(day);
}

type TimePickerSheetProps = {
  value: Date;
  onClose: () => void;
  onPick: (date: Date) => void;
};

export function TimePickerSheet({ value, onClose, onPick }: TimePickerSheetProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(
    () =>
      Array.from({ length: DAYS_SHOWN }, (_, index) => {
        const day = new Date(today);
        day.setDate(today.getDate() + index);
        return day;
      }),
    [today],
  );
  const [day, setDay] = useState(() => startOfDay(value));
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(
    MINUTES.includes(value.getMinutes()) ? value.getMinutes() : 0,
  );

  const picked = new Date(day);
  picked.setHours(hour, minute, 0, 0);
  const ok = isPickableTime(picked);

  return (
    <FormSheet
      title="Välj tid"
      onClose={onClose}
      gap="four"
      action={{ label: 'Klar', disabled: !ok, onPress: () => onPick(picked) }}
    >
      <View style={styles.section}>
        <SectionLabel>Dag</SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {days.map((item) => (
            <Chip
              key={item.toDateString()}
              role="radio"
              label={dayChipLabel(item, today)}
              selected={item.getTime() === day.getTime()}
              onPress={() => setDay(item)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionLabel>Klockan</SectionLabel>
        <View style={styles.clock}>
          <IconButton
            icon="remove"
            accessibilityLabel="En timme tidigare"
            onPress={() => setHour((h) => (h + 23) % 24)}
          />
          <ThemedText style={styles.time} accessibilityLiveRegion="polite">
            {clockText(picked)}
          </ThemedText>
          <IconButton
            icon="add"
            accessibilityLabel="En timme senare"
            onPress={() => setHour((h) => (h + 1) % 24)}
          />
        </View>
        <View style={styles.row}>
          {MINUTES.map((item) => (
            <Chip
              key={item}
              role="radio"
              label={`:${String(item).padStart(2, '0')}`}
              selected={item === minute}
              onPress={() => setMinute(item)}
            />
          ))}
        </View>
      </View>

      <ThemedText type="smallBold" themeColor={ok ? 'text' : 'textSecondary'} style={styles.result}>
        {ok ? exactTimeText(picked) : 'Den tiden har redan varit. Välj en senare.'}
      </ThemedText>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  clock: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  time: { ...Typography.display, minWidth: 120, textAlign: 'center' },
  result: { textAlign: 'center' },
});
