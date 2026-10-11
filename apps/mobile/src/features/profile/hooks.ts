import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useUserId } from '@/hooks/use-user-id';
import { countMyPosts, fetchMyCars, fetchPosts, fetchProfile, POSTS_PAGE_SIZE } from '@/lib/api';
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

export function useMyPosts() {
  const userId = useUserId();
  return useInfiniteQuery({
    queryKey: queryKeys.authorPosts(userId),
    queryFn: ({ pageParam }) => fetchPosts(pageParam, userId),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === POSTS_PAGE_SIZE ? pages.length : undefined,
    enabled: !!userId,
  });
}
