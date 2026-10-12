import { useState, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { SectionLabel } from '@/components/section-label';
import { Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { completeOnboarding } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { enableLocationSharing } from '@/lib/location-sharing';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { useProfile } from '@/features/profile/hooks';
import { useUserId } from '@/hooks/use-user-id';

type Step = 'welcome' | 'friends' | 'location' | 'done';

const PROGRESS_STEPS: Step[] = ['welcome', 'friends', 'location'];

const FRIEND_WAYS: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
  href: '/friends/code' | '/friends/scan' | '/friends/nearby';
}[] = [
  {
    icon: 'qr-code-outline',
    title: 'Visa min kod',
    detail: 'Låt en kompis skanna, koden byts var 10:e minut',
    href: '/friends/code',
  },
  {
    icon: 'scan-outline',
    title: 'Skanna en kod',
    detail: 'Stå bredvid varandra och skanna',
    href: '/friends/scan',
  },
  {
    icon: 'radio-outline',
    title: Words.radar,
    detail: 'Se vilka som har radarn öppen inom 100 m',
    href: '/friends/nearby',
  },
];

const LOCATION_FACTS = [
  'Bara dina kompisar ser dig, aldrig någon annan',
  'Välj ungefärlig plats, ca 300 m, i stället för exakt',
  'Spökläge och av-knapp finns alltid på kartan',
];

function ProgressDots({ step }: { step: Step }) {
  const theme = useTheme();
  const current = PROGRESS_STEPS.indexOf(step);
  return (
    <View
      style={styles.dots}
      accessibilityRole="progressbar"
      accessibilityLabel={`Steg ${current + 1} av ${PROGRESS_STEPS.length}`}
    >
      {PROGRESS_STEPS.map((key, index) => (
        <View
          key={key}
          style={[
            styles.dot,
            index === current
              ? [styles.dotActive, { backgroundColor: theme.brand }]
              : { backgroundColor: theme.backgroundSelected },
          ]}
        />
      ))}
    </View>
  );
}

function Badge({
  size,
  icon,
  color,
}: {
  size: number;
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return (
    <View
      style={[
        styles.badgeOuter,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}29` },
      ]}
    >
      <View
        style={{
          width: size * 0.66,
          height: size * 0.66,
          borderRadius: size * 0.33,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={size * 0.34} color="#FFFFFF" />
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('welcome');
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const { data: profile } = useProfile();
  const firstName = profile?.display_name.trim().split(' ')[0];

  async function finish(next?: '/cars/new') {
    if (!userId || finishing) return;
    setFinishing(true);
    try {
      await completeOnboarding(userId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      router.replace('/');
      if (next) router.push(next);
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
      setFinishing(false);
    }
  }

  async function shareLocation() {
    if (!userId) return;
    setLocationBusy(true);
    setLocationNote(null);
    try {
      const result = await enableLocationSharing(userId);
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
        showToast({ tone: 'success', message: 'Nu ser dina kompisar dig på kartan!' });
      } else {
        setLocationNote('Okej, kartan är av. Du kan slå på den i Inställningar senare.');
      }
    } catch {
      setLocationNote('Okej, kartan är av. Du kan slå på den i Inställningar senare.');
    } finally {
      setLocationBusy(false);
      setStep('done');
    }
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          {step !== 'done' ? <ProgressDots step={step} /> : <View />}
          {step !== 'done' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => finish()}
              disabled={finishing}
              hitSlop={12}
            >
              <ThemedText type="smallBold" themeColor="brandOnSurface">
                Hoppa över
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          {step === 'welcome' ? (
            <>
              <View style={styles.art}>
                <Badge size={132} icon="radio-outline" color={theme.brand} />
              </View>
              <ThemedText type="title" accessibilityRole="header">
                {firstName ? `Välkommen till epaRadar, ${firstName}!` : 'Välkommen till epaRadar!'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Två snabba grejer så hittar du dina kompisar och ser vilka som är ute och rullar.
              </ThemedText>
            </>
          ) : null}

          {step === 'friends' ? (
            <>
              <ThemedText type="title" accessibilityRole="header">
                Vem kör du med?
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                I epaRadar lägger du bara till folk du faktiskt träffar. Ingen kan söka upp dig.
              </ThemedText>
              <View style={styles.cards}>
                {FRIEND_WAYS.map((way) => (
                  <Pressable
                    key={way.href}
                    accessibilityRole="button"
                    accessibilityHint={way.detail}
                    onPress={() => router.push(way.href)}
                    style={({ pressed }) => [
                      styles.card,
                      {
                        backgroundColor: pressed
                          ? theme.backgroundSelected
                          : theme.backgroundElement,
                      },
                    ]}
                  >
                    <View style={[styles.cardIcon, { backgroundColor: `${theme.brand}2E` }]}>
                      <Ionicons name={way.icon} size={22} color={theme.brandOnSurface} />
                    </View>
                    <View style={styles.flex}>
                      <ThemedText type="headline">{way.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {way.detail}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {step === 'location' ? (
            <>
              <View style={[styles.offPill, { backgroundColor: theme.backgroundElement }]}>
                <SectionLabel>Av som standard</SectionLabel>
              </View>
              <ThemedText type="title" accessibilityRole="header">
                Synas på kartan?
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Du väljer själv. Det går att ändra när som helst i Inställningar.
              </ThemedText>
              <View style={styles.facts}>
                {LOCATION_FACTS.map((fact) => (
                  <View key={fact} style={styles.fact}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                    <ThemedText style={styles.flex}>{fact}</ThemedText>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {step === 'done' ? (
            <>
              <View style={styles.art}>
                <Badge size={112} icon="checkmark" color={theme.success} />
              </View>
              <ThemedText type="title" accessibilityRole="header">
                Klart, nu rullar vi!
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                Visa upp traktorn och lägg till din EPA på profilen när du har en stund.
              </ThemedText>
              {locationNote ? (
                <View style={[styles.note, { backgroundColor: theme.backgroundElement }]}>
                  <Ionicons name="eye-off-outline" size={18} color={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                    {locationNote}
                  </ThemedText>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <View style={styles.actions}>
          {step === 'welcome' ? (
            <Button label="Kör igång" onPress={() => setStep('friends')} />
          ) : null}
          {step === 'friends' ? <Button label="Nästa" onPress={() => setStep('location')} /> : null}
          {step === 'location' ? (
            <>
              <Button
                label="Dela med kompisar"
                variant="secondary"
                loading={locationBusy}
                onPress={shareLocation}
              />
              <Button
                label="Inte nu"
                variant="secondary"
                disabled={locationBusy}
                onPress={() => setStep('done')}
              />
            </>
          ) : null}
          {step === 'done' ? (
            <>
              <Button label="Till flödet" loading={finishing} onPress={() => finish()} />
              <Button
                label="Lägg till min EPA"
                variant="ghost"
                disabled={finishing}
                onPress={() => finish('/cars/new')}
              />
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  dots: { flexDirection: 'row', gap: Spacing.one + Spacing.half },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  art: { alignItems: 'center', paddingVertical: Spacing.four },
  badgeOuter: { alignItems: 'center', justifyContent: 'center' },
  cards: { gap: Spacing.two, paddingTop: Spacing.two },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  facts: { gap: Spacing.three, paddingTop: Spacing.two },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  actions: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
});
