import { useQuery } from '@tanstack/react-query';

import { useUserId } from '@/hooks/use-user-id';
import { countMyPosts, fetchMyCars, fetchProfile } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
}

export function useMyCars() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.cars(userId),
    queryFn: () => fetchMyCars(userId!),
    enabled: !!userId,
  });
}

export function useMyPostCount() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.myPostCount(userId),
    queryFn: () => countMyPosts(userId!),
    enabled: !!userId,
  });
}
