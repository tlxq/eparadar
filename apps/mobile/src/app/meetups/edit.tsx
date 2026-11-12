import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { IconButton } from '@/components/icon-button';
import { ScreenBackground } from '@/components/screen-background';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Common, loadError } from '@/constants/strings';
import { Radius, Spacing } from '@/constants/theme';
import { meetupVibe } from '@/features/map/map-icons';
import { fetchMeetupDetail, updateMeetup } from '@/features/meetups/api';
import { MeetupForm } from '@/features/meetups/meetup-form';
import { useUserId } from '@/hooks/use-user-id';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

export default function EditMeetupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const {
    data: meetup,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.meetupDetail(id),
    queryFn: () => fetchMeetupDetail(id!, userId!),
    enabled: !!id && !!userId,
  });
  const [saving, setSaving] = useState(false);

  if (isError) {
    return (
      <ScreenBackground style={styles.center}>
        <ErrorState message={loadError('Träffen')} onRetry={refetch} />
      </ScreenBackground>
    );
  }

  if (isLoading || !meetup || !id) {
    return (
      <ScreenBackground style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <IconButton
              icon="close"
              accessibilityLabel={Common.close}
              onPress={() => router.back()}
            />
          </View>
          <View style={styles.skeletons}>
            <Skeleton height={64} radius={Radius.lg} />
            <Skeleton height={48} radius={Radius.md} />
            <Skeleton width="60%" />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <MeetupForm
      heading="Redigera träff"
      submitLabel={Common.save}
      submitIcon="checkmark"
      pending={saving}
      initial={{
        vibe: meetupVibe(meetup.vibe).key,
        title: meetup.title,
        description: meetup.description ?? '',
        startsAt: new Date(meetup.starts_at),
      }}
      extra={
        <View style={styles.place}>
          <ThemedText type="smallBold">Plats</ThemedText>
          <Button
            label="Flytta på kartan"
            icon="move-outline"
            variant="secondary"
            onPress={() => router.navigate({ pathname: '/karta', params: { move: id } })}
          />
        </View>
      }
      onSubmit={async (values) => {
        setSaving(true);
        try {
          await updateMeetup(id, {
            title: values.title,
            vibe: values.vibe,
            description: values.description,
            startsAt: values.startsAt.toISOString(),
          });
          queryClient.invalidateQueries({ queryKey: queryKeys.meetups() });
          queryClient.invalidateQueries({ queryKey: queryKeys.meetupDetail(id) });
          showToast({ tone: 'success', message: 'Träffen är uppdaterad!' });
          router.back();
        } catch (error) {
          showToast({ tone: 'error', message: getErrorMessage(error) });
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  skeletons: { padding: Spacing.three, gap: Spacing.three },
  place: { gap: Spacing.two },
});
