import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { DetailSummary, type DetailRow } from '@/components/detail-summary';
import { ListRow } from '@/components/list-row';
import { SectionLabel } from '@/components/section-label';
import { Button } from '@/components/button';
import { DropdownButton, type MenuItem } from '@/components/dropdown-menu';
import { ErrorState } from '@/components/error-state';
import { ModalHeader } from '@/components/modal-header';
import { useHeaderReveal } from '@/hooks/use-header-reveal';
import { reportItem } from '@/features/moderation/use-moderation-items';
import { ScreenBackground } from '@/components/screen-background';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { distanceMeters, formatDistance } from '@/features/map/spots';
import { useLastKnownPosition } from '@/features/map/use-last-known-position';
import { meetupVibe } from '@/features/map/map-icons';
import {
  useAutoCheckIn,
  useDeleteMeetup,
  useMeetupDetail,
  useToggleInterest,
} from '@/features/meetups/hooks';
import { ShareMeetupSheet } from '@/features/meetups/share-meetup-sheet';
import { formatMeetupTime } from '@/features/meetups/time';
import { openPerson } from '@/store/person-sheet';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { showToast } from '@/store/toast';
import { useUserId } from '@/hooks/use-user-id';
import { Common } from '@/constants/strings';

const TITLE_REVEAL_Y = 80;

type Person = { id: string; display_name: string; avatar_url: string | null };

function PeopleSection({
  label,
  people,
  subtitle,
  emptyText,
}: {
  label: string;
  people: Person[];
  subtitle?: string;
  emptyText?: string;
}) {
  return (
    <View style={styles.section}>
      <SectionLabel>{label}</SectionLabel>
      {people.length === 0 ? (
        <ThemedText themeColor="textSecondary">{emptyText}</ThemedText>
      ) : (
        <View style={styles.rowsBleed}>
          {people.map((person) => (
            <ListRow
              key={person.id}
              title={person.display_name}
              subtitle={subtitle}
              leading={<Avatar name={person.display_name} imageUrl={person.avatar_url} size={40} />}
              accessibilityLabel={`Visa ${person.display_name}`}
              onPress={() => openPerson(person.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function MeetupDetailScreen() {
  const theme = useTheme();
  const reveal = useHeaderReveal(TITLE_REVEAL_Y);
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();

  const { data: meetup, isLoading, isError, refetch } = useMeetupDetail(id, userId);
  const toggleInterest = useToggleInterest(id, userId);
  const deleteMeetup = useDeleteMeetup();
  const [shareOpen, setShareOpen] = useState(false);
  useAutoCheckIn(id);
  const myPosition = useLastKnownPosition();

  async function handleDelete() {
    if (!id) return;
    const ok = await confirmDestructive({
      title: 'Ta bort träffen?',
      message:
        'Träffen försvinner från kartan för alla, tillsammans med intresseanmälningar och incheckningar.',
      confirmLabel: Common.remove,
    });
    if (!ok) return;
    try {
      await deleteMeetup.mutateAsync(id);
      showToast({ message: 'Träffen är borttagen.' });
      if (router.canDismiss()) router.dismiss();
      else router.replace('/karta');
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  if (isError) {
    return (
      <ScreenBackground style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ModalHeader title="" leading="close" />
          <View style={styles.center}>
            <ErrorState
              message="Träffen gick inte att hämta. Den kan ha tagits bort, eller så strular nätet."
              onRetry={refetch}
            />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (isLoading || !meetup) {
    return (
      <ScreenBackground style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ModalHeader title="" leading="close" />
          <View style={styles.content}>
            <Skeleton width="70%" height={32} />
            <Skeleton width="45%" />
            <Skeleton width="35%" />
            <Skeleton height={48} radius={Radius.pill} style={styles.skeletonButton} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const iAmHereNow = meetup.hereNow.some((p) => p.id === userId);
  const isMine = meetup.creator_id === userId;
  const rows: DetailRow[] = [
    { icon: 'calendar-outline', text: formatMeetupTime(meetup.starts_at) },
  ];
  if (myPosition) {
    rows.push({
      icon: 'navigate-outline',
      text: `${formatDistance(distanceMeters(meetup, myPosition))} från dig`,
    });
  }
  const menuItems: MenuItem[] = isMine
    ? [
        {
          label: 'Redigera',
          icon: 'create-outline',
          onPress: () => router.push({ pathname: '/meetups/edit', params: { id: meetup.id } }),
        },
        {
          label: 'Ta bort träffen',
          icon: 'trash-outline',
          destructive: true,
          disabled: deleteMeetup.isPending,
          onPress: handleDelete,
        },
      ]
    : [
        reportItem(
          {
            type: 'meetup',
            id: meetup.id,
            userId: meetup.creator_id,
            name: meetup.creator?.display_name ?? 'skaparen',
          },
          'Rapportera träffen',
        ),
      ];

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ModalHeader
          title={meetup.title}
          leading="close"
          titleVisible={reveal.revealed}
          trailing={<DropdownButton items={menuItems} accessibilityLabel="Fler val för träffen" />}
        />

        <ScrollView
          onScroll={reveal.onScroll}
          scrollEventThrottle={reveal.scrollEventThrottle}
          contentContainerStyle={styles.content}
        >
          {meetup.here_now_count > 0 && (
            <View style={[styles.liveBanner, { backgroundColor: `${theme.success}24` }]}>
              <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
              <ThemedText type="smallBold" themeColor="success">
                {meetup.here_now_count} är här nu
              </ThemedText>
            </View>
          )}

          <DetailSummary
            title={meetup.title}
            kindLabel={meetupVibe(meetup.vibe).label}
            kindIcon={<SvgXml xml={meetupVibe(meetup.vibe).icon} width={20} height={20} />}
            creator={
              meetup.creator
                ? {
                    id: meetup.creator.id,
                    name: meetup.creator.display_name,
                    avatarUrl: meetup.creator.avatar_url,
                  }
                : null
            }
            isMine={isMine}
            rows={rows}
            description={meetup.description}
          />

          <View style={styles.actions}>
            {!isMine ? (
              <Button
                label={meetup.isInterested ? 'Du är intresserad' : 'Jag är intresserad'}
                icon={meetup.isInterested ? 'checkmark-circle' : 'eye-outline'}
                variant={meetup.isInterested ? 'secondary' : 'primary'}
                onPress={() => toggleInterest.mutate(!meetup.isInterested)}
                disabled={toggleInterest.isPending}
              />
            ) : null}
            <View style={styles.actionRow}>
              <View style={styles.action}>
                <Button
                  label="Visa på kartan"
                  icon="map-outline"
                  variant="secondary"
                  size="sm"
                  onPress={() =>
                    router.navigate({ pathname: '/karta', params: { meetup: meetup.id } })
                  }
                />
              </View>
              <View style={styles.action}>
                <Button
                  label="Dela"
                  icon="paper-plane-outline"
                  variant="secondary"
                  size="sm"
                  onPress={() => setShareOpen(true)}
                />
              </View>
            </View>
          </View>

          {meetup.hereNow.length > 0 ? (
            <PeopleSection label="Här nu" people={meetup.hereNow} subtitle="GPS · automatiskt" />
          ) : null}

          <PeopleSection
            label={`Intresserade · ${meetup.interest_count}`}
            people={meetup.interested}
            emptyText={
              isMine
                ? 'Ingen har anmält sig ännu. Dela träffen så blir ni fler.'
                : 'Ingen har anmält sig ännu. Bli först!'
            }
          />

          {iAmHereNow && (
            <View
              style={[
                styles.autoStatus,
                { borderColor: theme.success, backgroundColor: `${theme.success}18` },
              ]}
            >
              <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
              <ThemedText type="smallBold" themeColor="success">
                Du är här nu
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.autoTag}>
                GPS · automatiskt
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      {shareOpen ? <ShareMeetupSheet meetup={meetup} onClose={() => setShareOpen(false)} /> : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  safeArea: { flex: 1 },
  skeletonButton: { marginTop: Spacing.four },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  actions: { gap: Spacing.two },
  actionRow: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1 },
  section: { gap: Spacing.one },
  rowsBleed: { marginHorizontal: -Spacing.three },
  autoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  autoTag: { marginLeft: 'auto' },
});
