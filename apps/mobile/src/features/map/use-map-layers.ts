import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useFriendLocations, useMyLocation } from '@/features/map/hooks';
import { useMapPosts } from '@/features/feed/hooks';
import {
  friendMarkers,
  meetupMarkers,
  meMarker,
  postMarkers,
  spotMarkers,
} from '@/features/map/markers';
import { fetchSpotPhotoCounts, fetchSpots } from '@/features/map/spots';
import { fetchEveningHeat, type HeatCell } from '@/features/map/status';
import { useForegroundLocationSync } from '@/features/map/use-foreground-location-sync';
import { useDevicePosition } from '@/features/map/use-device-position';
import { useMeetups } from '@/features/meetups/hooks';
import { useMyCars, useProfile } from '@/features/profile/hooks';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { useUserId } from '@/hooks/use-user-id';
import { queryKeys } from '@/lib/query-keys';

const NO_HEAT: HeatCell[] = [];

export function useMapLayers() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const device = useDevicePosition();

  const { data: friendLocations } = useFriendLocations();
  const { data: meetups } = useMeetups();
  const { data: myLocation } = useMyLocation();
  const { data: myProfile } = useProfile();
  useForegroundLocationSync({
    userId,
    enabled: !!myLocation?.sharing_enabled,
    position: device.position,
    motion: device.motion,
  });
  const { data: myCars } = useMyCars();
  const { data: heatCells } = useQuery({
    queryKey: queryKeys.eveningHeat(userId),
    queryFn: fetchEveningHeat,
    enabled: !!userId,
    refetchInterval: 120000,
  });
  const { data: spots } = useQuery({
    queryKey: queryKeys.spots(),
    queryFn: fetchSpots,
    enabled: !!userId,
    refetchInterval: 60000,
  });
  const { data: mapPosts } = useMapPosts();
  const { data: photoCounts } = useQuery({
    queryKey: queryKeys.spotPhotoCounts(),
    queryFn: fetchSpotPhotoCounts,
    enabled: !!userId,
    refetchInterval: 120000,
  });

  useRealtimeTable({
    channelName: `spot_photos:${userId}`,
    table: 'spot_photos',
    enabled: !!userId,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotoCounts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.allSpotPhotos() });
    },
  });

  useRealtimeTable({
    channelName: `spots:${userId}`,
    table: 'spots',
    enabled: !!userId,
    onChange: () => queryClient.invalidateQueries({ queryKey: queryKeys.spots() }),
  });

  useRealtimeTable({
    channelName: `locations:${userId}`,
    table: 'locations',
    enabled: !!userId,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friendLocations(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
    },
  });

  const friends = useMemo(() => friendMarkers(friendLocations), [friendLocations]);
  const me = useMemo(
    () =>
      meMarker({
        devicePosition: device.position,
        motion: device.motion,
        location: myLocation,
        profile: myProfile,
        cars: myCars,
      }),
    [device.position, device.motion, myLocation, myProfile, myCars],
  );
  const meetupLayer = useMemo(() => meetupMarkers(meetups), [meetups]);
  const postLayer = useMemo(() => postMarkers(mapPosts), [mapPosts]);
  const spotLayer = useMemo(
    () => spotMarkers(spots, friends, me, photoCounts, userId),
    [spots, friends, me, photoCounts, userId],
  );

  return {
    devicePosition: device.position,
    deviceMotion: device.motion,
    locationAccess: device.access,
    recheckLocation: device.recheck,
    friendLocations,
    myLocation,
    myProfile,
    spots,
    heat: heatCells ?? NO_HEAT,
    layers: { friends, me, meetups: meetupLayer, spots: spotLayer, posts: postLayer },
  };
}
