import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { blockUser, fetchMeetupSuggestions, fetchMutualSuggestions, unblockUser } from '@/features/friends/api';
import { queryKeys } from '@/lib/query-keys';

export function useMeetupSuggestions(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.meetupSuggestions(userId),
    queryFn: fetchMeetupSuggestions,
    enabled: !!userId,
  });
}

export function useMutualSuggestions(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.mutualSuggestions(userId),
    queryFn: fetchMutualSuggestions,
    enabled: !!userId,
  });
}

export function useBlockUser(myUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: string) => blockUser(targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(myUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests(myUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.meetupSuggestions(myUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mutualSuggestions(myUserId) });
    },
  });
}

export function useUnblockUser(myUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetUserId: string) => unblockUser(targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(myUserId) });
    },
  });
}
