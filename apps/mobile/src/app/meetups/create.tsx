import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCreateMeetup } from '@/features/meetups/hooks';
import { quickTimeToDate, type QuickTimeOption } from '@/features/meetups/time';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth';

const VIBES = ['🔥', '🚗', '🎉', '🍕'];
const TIME_OPTIONS: { value: QuickTimeOption; label: string }[] = [
  { value: 'tonight', label: 'Ikväll' },
  { value: 'tomorrow', label: 'I morgon' },
  { value: 'weekend', label: 'Helgen' },
];

export default function CreateMeetupScreen() {
  const theme = useTheme();
  const userId = useAuthStore((state) => state.session?.user.id);
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();

  const [vibe, setVibe] = useState(VIBES[0]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState<QuickTimeOption>('tonight');

  const createMeetup = useCreateMeetup();

  const handleSubmit = () => {
    if (!userId || !title.trim() || !lat || !lng) return;
    createMeetup.mutate(
      {
        creatorId: userId,
        title: title.trim(),
        vibeEmoji: vibe,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        startsAt: quickTimeToDate(time).toISOString(),
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ThemedText type="link" themeColor="textSecondary">
              Avbryt
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText type="subtitle" style={styles.heading}>
          Vad kör vi? 🔥
        </ThemedText>

        <View style={styles.vibeRow}>
          {VIBES.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => setVibe(emoji)}
              style={[
                styles.vibeCircle,
                { backgroundColor: vibe === emoji ? theme.accent : theme.backgroundElement },
              ]}
            >
              <ThemedText style={styles.vibeEmoji}>{emoji}</ThemedText>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder='T.ex. "Cruising vid torget"'
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
          autoFocus
        />

        <View style={styles.timeRow}>
          {TIME_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setTime(option.value)}
              style={[
                styles.timeChip,
                { backgroundColor: time === option.value ? theme.brand : theme.backgroundElement },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: time === option.value ? theme.brandText : theme.textSecondary }}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.submitRow}>
          <Button
            label="Släpp pinnen 🚀"
            onPress={handleSubmit}
            disabled={!title.trim()}
            loading={createMeetup.isPending}
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: Spacing.two },
  heading: { marginTop: Spacing.two },
  vibeRow: { flexDirection: 'row', gap: Spacing.two },
  vibeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vibeEmoji: { fontSize: 22 },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  timeRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  timeChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  submitRow: { marginTop: 'auto', paddingBottom: Spacing.four },
});
