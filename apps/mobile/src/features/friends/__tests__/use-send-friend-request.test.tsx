import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { friendRequestToast } from '@/features/friends/friend-request';
import { useSendFriendRequest } from '@/features/friends/hooks';
import { useToastStore } from '@/store/toast';

const mockSend = jest.fn<(id: string) => Promise<{ status: string }>>();

jest.mock('@/lib/api', () => ({
  fetchBlocked: jest.fn(),
  fetchFriends: jest.fn(),
  fetchOutgoingRequests: jest.fn(),
  fetchPendingRequests: jest.fn(),
  respondToFriendRequest: jest.fn(),
  sendFriendRequest: (id: string) => mockSend(id),
}));

jest.mock('@/hooks/use-user-id', () => ({ useUserId: () => 'me' }));
jest.mock('@/lib/push-notifications', () => ({ maybeRequestNotificationPermission: jest.fn() }));
jest.mock('@/lib/haptics', () => ({ successHaptic: jest.fn(), tapHaptic: jest.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('friendRequestToast', () => {
  it('says friends when the request was accepted at once', () => {
    expect(friendRequestToast('accepted', 'Kim')).toBe('Du och Kim är kompisar nu!');
  });

  it('says the request was sent otherwise', () => {
    expect(friendRequestToast('pending', 'Kim')).toBe('Förfrågan skickad till Kim!');
  });
});

describe('useSendFriendRequest', () => {
  beforeEach(() => {
    mockSend.mockReset();
    useToastStore.setState({ toast: null });
  });

  it('always shows a success toast', async () => {
    mockSend.mockResolvedValue({ status: 'pending' });
    const { result } = await renderHook(() => useSendFriendRequest(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ userId: 'u2', name: 'Kim' });
    });
    expect(mockSend).toHaveBeenCalledWith('u2');
    expect(useToastStore.getState().toast?.message).toBe('Förfrågan skickad till Kim!');
    expect(useToastStore.getState().toast?.tone).toBe('success');
  });

  it('shows an error toast when sending fails', async () => {
    mockSend.mockRejectedValue(new Error('nät'));
    const { result } = await renderHook(() => useSendFriendRequest(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ userId: 'u2', name: 'Kim' }).catch(() => undefined);
    });
    expect(useToastStore.getState().toast?.tone).toBe('error');
  });
});
