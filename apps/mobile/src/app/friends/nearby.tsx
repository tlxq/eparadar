import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { DropdownButton } from '@/components/dropdown-menu';
import { EmptyState } from '@/components/empty-state';
import { ListRow } from '@/components/list-row';
import { ScreenBackground } from '@/components/screen-background';
import { SectionLabel } from '@/components/section-label';
import { ThemedText } from '@/components/themed-text';
import { Words } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { RadarHero } from '@/features/friends/components/radar-hero';
import type { NearbyPerson } from '@/features/friends/nearby';
import { useSendFriendRequest } from '@/features/friends/hooks';
import { useNearbyRadar } from '@/features/friends/use-nearby-radar';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query-keys';
import { useModerationItems } from '@/features/moderation/use-moderation-items';
import { useRadarIgnoreStore } from '@/store/radar-ignore';
import { showUndoToast } from '@/store/toast';
import { useUserId } from '@/hooks/use-user-id';
import { ModalHeader } from '@/components/modal-header';

const RADAR_SIZE = 220;
const SEARCH_TIMEOUT_MS = 30000;
const BLIP_SIZE = 44;
const BLIP_SPOTS = [
  { x: 0.68, y: 0.3 },
  { x: 0.28, y: 0.64 },
  { x: 0.72, y: 0.7 },
  { x: 0.32, y: 0.28 },
  { x: 0.5, y: 0.84 },
] as const;

function Blips({ people }: { people: NearbyPerson[] }) {
  const theme = useTheme();
  return (
    <>
      {people.slice(0, BLIP_SPOTS.length).map((person, index) => (
        <View
          key={person.user_id}
          pointerEvents="none"
          style={[
            styles.blip,
            {
              left: BLIP_SPOTS[index].x * RADAR_SIZE - BLIP_SIZE / 2,
              top: BLIP_SPOTS[index].y * RADAR_SIZE - BLIP_SIZE / 2,
              borderColor: theme.brand,
            },
          ]}
        >
          <Avatar name={person.display_name} imageUrl={person.avatar_url} size={BLIP_SIZE - 6} />
        </View>
      ))}
    </>
  );
}

function PersonRow({ person, myUserId }: { person: NearbyPerson; myUserId: string }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const moderationItems = useModerationItems();
  const ignore = useRadarIgnoreStore((state) => state.ignore);
  const unignore = useRadarIgnoreStore((state) => state.unignore);

  function handleIgnore() {
    ignore(person.user_id);
    showUndoToast({
      message: `${person.display_name} syns inte på din radar längre.`,
      onUndo: () => unignore(person.user_id),
    });
  }

  const add = useSendFriendRequest();

  const accepted = add.data?.status === 'accepted';
  const sent = !accepted && (person.request_state === 'sent' || add.isSuccess);

  return (
    <ListRow
      title={person.display_name}
      subtitle={
        person.request_state === 'received' && !accepted
          ? 'Vill bli din kompis'
          : `@${person.username}`
      }
      leading={<Avatar name={person.display_name} imageUrl={person.avatar_url} size={48} />}
      trailing={
        <View style={styles.trailing}>
          {accepted ? (
            <View style={styles.sent}>
              <Ionicons name="checkmark" size={16} color={theme.success} />
              <ThemedText type="smallBold" themeColor="success">
                {Words.friends}
              </ThemedText>
            </View>
          ) : sent ? (
            <View style={styles.sent}>
              <Ionicons name="checkmark" size={16} color={theme.success} />
              <ThemedText type="smallBold" themeColor="success">
                Skickad
              </ThemedText>
            </View>
          ) : (
            <Button
              label={person.request_state === 'received' ? 'Acceptera' : 'Lägg till'}
              size="sm"
              loading={add.isPending}
              onPress={() => add.mutate({ userId: person.user_id, name: person.display_name })}
            />
          )}
          <DropdownButton
            variant="plain"
            size={36}
            accessibilityLabel={`Fler val för ${person.display_name}`}
            items={[
              {
                label: 'Ignorera',
                icon: 'eye-off-outline',
                hint: 'Döljs bara på din radar',
                onPress: handleIgnore,
              },
              ...moderationItems({
                report: {
                  type: 'profile',
                  id: person.user_id,
                  userId: person.user_id,
                  name: person.display_name,
                },
                onBlocked: () =>
                  queryClient.invalidateQueries({ queryKey: queryKeys.allNearby(myUserId) }),
              }),
            ]}
          />
        </View>
      }
    />
  );
}

function PermissionPrompt({ blocked, onAllow }: { blocked: boolean; onAllow: () => void }) {
  return (
    <View style={styles.centerFill}>
      <EmptyState
        icon="location-outline"
        title="Platsen behövs för radarn"
        message="Din plats används bara medan den här skärmen är öppen, för att hitta folk inom 100 meter. Ingen ser var du är."
        action={
          blocked
            ? {
                label: 'Öppna inställningar',
                icon: 'settings-outline',
                onPress: () => Linking.openSettings(),
              }
            : { label: 'Tillåt plats', icon: 'location', onPress: onAllow }
        }
      />
    </View>
  );
}

export default function NearbyRadarScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const [timedOut, setTimedOut] = useState(false);
  const {
    permission,
    requestPermission,
    locating,
    people: found,
    isError,
  } = useNearbyRadar(userId, timedOut);
  const ignored = useRadarIgnoreStore((state) => state.ignored);
  const people = found.filter((person) => !ignored.includes(person.user_id));
  const needsPermission =
    permission === 'undetermined' || permission === 'denied' || permission === 'blocked';
  const foundSomeone = people.length > 0;

  useEffect(() => {
    if (permission !== 'granted' || timedOut || foundSomeone) return;
    const timer = setTimeout(() => setTimedOut(true), SEARCH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [permission, timedOut, foundSomeone]);

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ModalHeader title={Words.radar} leading="close" />

        {needsPermission ? (
          <PermissionPrompt blocked={permission === 'blocked'} onAllow={requestPermission} />
        ) : timedOut ? (
          <View style={styles.centerFill} accessibilityLiveRegion="polite">
            <EmptyState
              icon="radio-outline"
              title="Ingen hittad"
              message="Skanna koden i stället. Radarn är avstängd nu, så ingen ser dig på den."
              action={{
                label: 'Skanna kod',
                icon: 'scan-outline',
                onPress: () => router.replace('/friends/scan'),
              }}
            />
            <View style={styles.retry}>
              <Button
                label="Sök igen"
                icon="refresh"
                variant="ghost"
                onPress={() => setTimedOut(false)}
              />
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.radar}>
              <RadarHero size={RADAR_SIZE} />
              <Blips people={people} />
            </View>
            <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
              <View style={[styles.dot, { backgroundColor: theme.success }]} />
              <ThemedText type="caption" themeColor="textSecondary">
                Du syns bara medan skärmen är öppen
              </ThemedText>
            </View>

            {people.length > 0 ? (
              <View style={styles.list} accessibilityLiveRegion="polite">
                <SectionLabel
                  style={styles.sectionLabel}
                >{`${people.length} i närheten`}</SectionLabel>
                {people.map((person) => (
                  <PersonRow key={person.user_id} person={person} myUserId={userId!} />
                ))}
              </View>
            ) : (
              <View style={styles.searching}>
                <ThemedText type="headline" style={styles.center}>
                  {locating ? 'Hittar din position…' : 'Söker efter folk i närheten…'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                  Be kompisen starta radarn samtidigt. Ni behöver vara inom ungefär 100 meter.
                </ThemedText>
                {isError ? (
                  <ThemedText type="error" style={styles.center}>
                    Radarn tappade kontakten. Den försöker igen automatiskt.
                  </ThemedText>
                ) : null}
              </View>
            )}
          </ScrollView>
        )}

        <View style={styles.footer}>
          <Button
            label="Visa min kod i stället"
            icon="qr-code-outline"
            variant="secondary"
            onPress={() => router.replace('/friends/code')}
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    alignItems: 'stretch',
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  radar: { width: RADAR_SIZE, height: RADAR_SIZE, alignSelf: 'center', marginBottom: Spacing.two },
  blip: {
    position: 'absolute',
    width: BLIP_SIZE,
    height: BLIP_SIZE,
    borderRadius: BLIP_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  list: { marginTop: Spacing.two },
  sectionLabel: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  sent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  searching: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  center: { textAlign: 'center' },
  centerFill: { flex: 1, justifyContent: 'center' },
  retry: { alignSelf: 'center' },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
