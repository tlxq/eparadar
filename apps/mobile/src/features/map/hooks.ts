import { useQuery } from '@tanstack/react-query';

import { useUserId } from '@/hooks/use-user-id';
import { fetchFriendLocations, fetchMyLocation } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useFriendLocations() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.friendLocations(userId),
    queryFn: () => fetchFriendLocations(userId!),
    enabled: !!userId,
  });
}

export function useMyLocation() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.myLocation(userId),
    queryFn: () => fetchMyLocation(userId!),
    enabled: !!userId,
  });
}
