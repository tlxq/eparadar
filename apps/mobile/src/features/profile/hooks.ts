import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { useFriends } from '@/features/friends/hooks';
import { useUserId } from '@/hooks/use-user-id';
import {
  countMyPosts,
  fetchCar,
  fetchMutualFriends,
  fetchMyCars,
  fetchPosts,
  fetchProfile,
  friendProfile,
  POSTS_PAGE_SIZE,
} from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { SIGNED_URL_REFRESH_MS } from '@/lib/queryClient';

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
    refetchInterval: SIGNED_URL_REFRESH_MS,
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === POSTS_PAGE_SIZE ? pages.length : undefined,
    enabled: !!userId,
  });
}

export function usePersonProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
}

export function usePersonCars(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.cars(userId),
    queryFn: () => fetchMyCars(userId!),
    enabled: !!userId,
  });
}

export function usePersonPostCount(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.myPostCount(userId),
    queryFn: () => countMyPosts(userId!),
    enabled: !!userId && enabled,
  });
}

export function usePersonPosts(userId: string | undefined, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.authorPosts(userId),
    queryFn: ({ pageParam }) => fetchPosts(pageParam, userId),
    refetchInterval: SIGNED_URL_REFRESH_MS,
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === POSTS_PAGE_SIZE ? pages.length : undefined,
    enabled: !!userId && enabled,
  });
}

export function useMutualFriends(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.mutualFriends(userId),
    queryFn: () => fetchMutualFriends(userId!),
    enabled: !!userId && enabled,
  });
}

export function useCar(carId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.car(carId),
    queryFn: () => fetchCar(carId!),
    enabled: !!carId,
  });
}

export function useCarPosts(carId: string | undefined, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.carPosts(carId),
    queryFn: ({ pageParam }) => fetchPosts(pageParam, undefined, carId),
    refetchInterval: SIGNED_URL_REFRESH_MS,
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === POSTS_PAGE_SIZE ? pages.length : undefined,
    enabled: !!carId && enabled,
  });
}

export function useIsFriend(personId: string | undefined) {
  const myUserId = useUserId();
  const friends = useFriends();
  const isFriend =
    !!myUserId && !!friends.data?.some((f) => friendProfile(f, myUserId).id === personId);
  return { isFriend, isLoading: friends.isLoading };
}
