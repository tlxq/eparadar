import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { KeyboardAvoider } from '@/components/keyboard-avoider';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { MEETUP_VIBES, type MeetupVibe } from '@/features/map/map-icons';
import { useCreateMeetup } from '@/features/meetups/hooks';
import { quickTimeToDate, type QuickTimeOption } from '@/features/meetups/time';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth';

const TIME_OPTIONS: { value: QuickTimeOption; label: string }[] = [
  { value: 'tonight', label: 'Ikväll' },
  { value: 'tomorrow', label: 'I morgon' },
  { value: 'weekend', label: 'Helgen' },
];

export default function CreateMeetupScreen() {
  const theme = useTheme();
  const userId = useAuthStore((state) => state.session?.user.id);
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();

  const [vibe, setVibe] = useState<MeetupVibe>('cruising');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState<QuickTimeOption>('tonight');

  const createMeetup = useCreateMeetup();

  const handleSubmit = () => {
    if (!userId || !title.trim() || !lat || !lng) return;
    createMeetup.mutate(
      {
        creatorId: userId,
        title: title.trim(),
        vibe,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        startsAt: quickTimeToDate(time).toISOString(),
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoider style={styles.container}>
          <View style={styles.header}>
            <Button label="Avbryt" variant="ghost" size="sm" onPress={() => router.back()} />
            <ThemedText type="headline">Ny träff</ThemedText>
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
              onChangeText={setTitle}
              placeholder='T.ex. "Cruising vid torget"'
              maxLength={60}
            />

            <View style={styles.section}>
              <ThemedText type="smallBold">När?</ThemedText>
              <View style={styles.timeRow}>
                {TIME_OPTIONS.map((option) => {
                  const selected = time === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setTime(option.value)}
                      style={[
                        styles.timeChip,
                        { backgroundColor: selected ? theme.brand : theme.backgroundElement },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ color: selected ? theme.brandText : theme.textSecondary }}
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.separator }]}>
            <Button
              label="Släpp pinnen"
              icon="location"
              onPress={handleSubmit}
              disabled={!title.trim()}
              loading={createMeetup.isPending}
            />
          </View>
        </KeyboardAvoider>
      </SafeAreaView>
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
  timeChip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
