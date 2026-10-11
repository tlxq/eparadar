import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { ScreenBackground } from '@/components/screen-background';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { meetupVibe } from '@/features/map/map-icons';
import {
  useAutoCheckIn,
  useDeleteMeetup,
  useMeetupDetail,
  useToggleInterest,
} from '@/features/meetups/hooks';
import { formatMeetupTime } from '@/features/meetups/time';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { showToast } from '@/store/toast';
import { useUserId } from '@/hooks/use-user-id';

export default function MeetupDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();

  const { data: meetup, isLoading, isError, error } = useMeetupDetail(id, userId);
  const toggleInterest = useToggleInterest(id, userId);
  const deleteMeetup = useDeleteMeetup();
  useAutoCheckIn(id);

  async function handleDelete() {
    if (!id) return;
    const ok = await confirmDestructive({
      title: 'Ta bort träffen?',
      message:
        'Träffen försvinner från kartan för alla, tillsammans med intresseanmälningar och incheckningar.',
      confirmLabel: 'Ta bort',
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
      <ScreenBackground style={styles.center}>
        <View style={styles.errorClose}>
          <IconButton icon="close" accessibilityLabel="Stäng" onPress={() => router.back()} />
        </View>
        <ThemedText themeColor="danger" style={styles.errorText}>
          Kunde inte hämta träffen.{'\n'}
          {(() => {
            if (error instanceof Error) return error.message;
            if (error && typeof error === 'object') {
              const err = error as {
                message?: string;
                details?: string;
                hint?: string;
                code?: string;
              };
              return [err.code, err.message, err.details, err.hint].filter(Boolean).join(' — ');
            }
            return String(error);
          })()}
        </ThemedText>
      </ScreenBackground>
    );
  }

  if (isLoading || !meetup) {
    return (
      <ScreenBackground style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <IconButton icon="close" accessibilityLabel="Stäng" onPress={() => router.back()} />
          </View>
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

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <IconButton icon="close" accessibilityLabel="Stäng" onPress={() => router.back()} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {meetup.hereNow.length > 0 && (
            <View style={[styles.liveBanner, { backgroundColor: `${theme.success}24` }]}>
              <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
              <ThemedText type="smallBold" themeColor="success">
                {meetup.hereNow.length} är här nu
              </ThemedText>
            </View>
          )}

          <View style={styles.titleRow}>
            <View style={[styles.vibeTile, { backgroundColor: theme.backgroundElement }]}>
              <SvgXml xml={meetupVibe(meetup.vibe).icon} width={34} height={34} />
            </View>
            <View style={styles.titleText}>
              <ThemedText type="caption" themeColor="textSecondary">
                {meetupVibe(meetup.vibe).label}
              </ThemedText>
              <ThemedText type="title" style={styles.title}>
                {meetup.title}
              </ThemedText>
            </View>
          </View>

          <ThemedText themeColor="textSecondary">
            {meetup.creator ? `${meetup.creator.display_name} skapade denna` : null}
          </ThemedText>

          <ThemedText type="smallBold" style={styles.meta}>
            {formatMeetupTime(meetup.starts_at)}
          </ThemedText>

          {meetup.interested.length > 0 && (
            <View style={styles.avatarStrip}>
              <View style={styles.avatars}>
                {meetup.interested.slice(0, 6).map((person) => (
                  <View key={person.id} style={styles.avatarWrap}>
                    <Avatar name={person.display_name} imageUrl={person.avatar_url} size={30} />
                  </View>
                ))}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {meetup.interest_count} intresserade
              </ThemedText>
            </View>
          )}

          <View style={styles.interestedButton}>
            <Button
              label={`${meetup.isInterested ? 'Du är intresserad' : 'Jag är intresserad'} · ${meetup.interest_count}`}
              icon={meetup.isInterested ? 'checkmark-circle' : 'eye-outline'}
              variant={meetup.isInterested ? 'secondary' : 'primary'}
              onPress={() => toggleInterest.mutate(!meetup.isInterested)}
              disabled={toggleInterest.isPending}
            />
          </View>

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

          {meetup.creator_id === userId ? (
            <View style={styles.deleteButton}>
              <Button
                label="Ta bort träffen"
                icon="trash-outline"
                variant="secondary"
                tone="danger"
                loading={deleteMeetup.isPending}
                onPress={handleDelete}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  vibeTile: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: { flex: 1 },
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorClose: { position: 'absolute', top: Spacing.five, right: Spacing.three },
  errorText: { textAlign: 'center', paddingHorizontal: Spacing.four },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  skeletonButton: { marginTop: Spacing.four },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.five, gap: Spacing.two },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    marginBottom: Spacing.two,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  title: { fontSize: 28, lineHeight: 34 },
  meta: { marginTop: Spacing.one },
  avatarStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  avatars: { flexDirection: 'row' },
  avatarWrap: { marginLeft: -Spacing.two },
  interestedButton: { marginTop: Spacing.four },
  deleteButton: { marginTop: Spacing.five },
  autoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.two,
  },
  autoTag: { marginLeft: 'auto' },
});
