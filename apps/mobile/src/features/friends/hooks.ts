import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  blockUser,
  fetchMeetupSuggestions,
  fetchMutualSuggestions,
  unblockUser,
} from '@/features/friends/api';
import { useUserId } from '@/hooks/use-user-id';
import { fetchFriends, fetchOutgoingRequests, fetchPendingRequests } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useFriends() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.friends(userId),
    queryFn: () => fetchFriends(userId!),
    enabled: !!userId,
  });
}

export function useFriendRequests() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.friendRequests(userId),
    queryFn: () => fetchPendingRequests(userId!),
    enabled: !!userId,
  });
}

export function useOutgoingRequests() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.outgoingRequests(userId),
    queryFn: () => fetchOutgoingRequests(userId!),
    enabled: !!userId,
  });
}

export function useMeetupSuggestions() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.meetupSuggestions(userId),
    queryFn: fetchMeetupSuggestions,
    enabled: !!userId,
  });
}

export function useMutualSuggestions() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.mutualSuggestions(userId),
    queryFn: fetchMutualSuggestions,
    enabled: !!userId,
  });
}

export function useBlockUser() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: string) => blockUser(targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.meetupSuggestions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mutualSuggestions(userId) });
    },
  });
}

export function useUnblockUser() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: string) => unblockUser(targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(userId) });
    },
  });
}
