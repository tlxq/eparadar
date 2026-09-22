import { useEffect } from 'react';
import * as Location from 'expo-location';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  checkInAtMeetup,
  createMeetup,
  fetchMeetupDetail,
  fetchMeetups,
  setInterested,
} from '@/features/meetups/api';
import { queryKeys } from '@/lib/query-keys';
import { maybeRequestNotificationPermission } from '@/lib/push-notifications';
import { useRealtimeTable } from '@/hooks/use-realtime-table';

export function useMeetups() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.meetups(),
    queryFn: fetchMeetups,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.meetups() });

  useRealtimeTable({ channelName: 'meetups-list', table: 'meetups', onChange: invalidate });
  useRealtimeTable({ channelName: 'meetups-list-interests', table: 'meetup_interests', onChange: invalidate });
  useRealtimeTable({ channelName: 'meetups-list-checkins', table: 'meetup_checkins', onChange: invalidate });

  return query;
}

export function useMeetupDetail(meetupId: string | undefined, myUserId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.meetupDetail(meetupId),
    queryFn: () => fetchMeetupDetail(meetupId!, myUserId!),
    enabled: !!meetupId && !!myUserId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.meetupDetail(meetupId) });
  const filter = meetupId ? `meetup_id=eq.${meetupId}` : undefined;

  useRealtimeTable({
    channelName: `meetup-detail-interests-${meetupId}`,
    table: 'meetup_interests',
    filter,
    enabled: !!meetupId,
    onChange: invalidate,
  });
  useRealtimeTable({
    channelName: `meetup-detail-checkins-${meetupId}`,
    table: 'meetup_checkins',
    filter,
    enabled: !!meetupId,
    onChange: invalidate,
  });

  return query;
}

export function useToggleInterest(meetupId: string, myUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (interested: boolean) => setInterested(meetupId, myUserId!, interested),
    onSuccess: (_data, interested) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetupDetail(meetupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.meetups() });
      if (interested && myUserId) maybeRequestNotificationPermission(myUserId);
    },
  });
}

export function useCreateMeetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMeetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meetups() });
    },
  });
}

/** One-time foreground GPS check on mount — never touches background-location permissions. */
export function useAutoCheckIn(meetupId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!meetupId) return;
    let cancelled = false;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      let granted = status === 'granted';
      if (!granted) {
        const result = await Location.requestForegroundPermissionsAsync();
        granted = result.status === 'granted';
      }
      if (!granted || cancelled) return;

      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const isHere = await checkInAtMeetup(meetupId, position.coords.latitude, position.coords.longitude);
        if (isHere) {
          queryClient.invalidateQueries({ queryKey: queryKeys.meetupDetail(meetupId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.meetups() });
        }
      } catch {
        // best-effort — GPS timeout/unavailable shouldn't block viewing the meetup
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [meetupId, queryClient]);
}
