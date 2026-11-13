import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  blockUser,
  fetchMeetupSuggestions,
  fetchMutualSuggestions,
  unblockUser,
} from '@/features/friends/api';
import {
  friendRequestPermissionReason,
  friendRequestToast,
} from '@/features/friends/friend-request';
import { useUndoableRemoval } from '@/features/friends/use-undoable-removal';
import { useUserId } from '@/hooks/use-user-id';
import {
  fetchBlocked,
  fetchFriends,
  fetchOutgoingRequests,
  fetchPendingRequests,
  respondToFriendRequest,
  sendFriendRequest,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { successHaptic } from '@/lib/haptics';
import { maybeRequestNotificationPermission } from '@/lib/push-notifications';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

export function useFriends() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.friends(userId),
    queryFn: () => fetchFriends(userId!),
    enabled: !!userId,
  });
}

export function useBlockedUsers() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.blocked(userId),
    queryFn: () => fetchBlocked(userId!),
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
      queryClient.invalidateQueries({ queryKey: queryKeys.blocked(userId) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.blocked(userId) });
    },
  });
}

export function useSendFriendRequest() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId: targetUserId }: { userId: string; name: string }) =>
      sendFriendRequest(targetUserId),
    onSuccess: (row, { name }) => {
      successHaptic();
      queryClient.invalidateQueries({ queryKey: queryKeys.allNearby(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.outgoingRequests(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.meetupSuggestions(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.mutualSuggestions(userId) });
      showToast({ tone: 'success', message: friendRequestToast(row.status, name) });
      if (userId)
        maybeRequestNotificationPermission(userId, friendRequestPermissionReason(row.status));
    },
    onError: (error) => showToast({ tone: 'error', message: getErrorMessage(error) }),
  });
}

export function useAcceptFriendRequest() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId }: { requestId: string; name: string }) =>
      respondToFriendRequest(requestId, true),
    onSuccess: (_data, { name }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests(userId) });
      successHaptic();
      showToast({ tone: 'success', message: `Du och ${name} är kompisar nu!` });
      if (userId) maybeRequestNotificationPermission(userId, 'friend_accepted');
    },
    onError: () =>
      showToast({ tone: 'error', message: 'Det gick inte att svara på förfrågan. Testa igen!' }),
  });
}

export function useDeclineFriendRequest() {
  const userId = useUserId();
  const removeWithUndo = useUndoableRemoval(queryKeys.friendRequests(userId));

  return function declineRequest({ requestId, name }: { requestId: string; name: string }) {
    removeWithUndo({
      id: requestId,
      message: `Du nekade ${name}.`,
      commit: () => respondToFriendRequest(requestId, false),
      errorMessage: 'Det gick inte att neka förfrågan. Testa igen!',
    });
  };
}
