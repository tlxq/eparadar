import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useDeclineFriendRequest } from '@/features/friends/hooks';
import { usePendingRemovals } from '@/store/pending-removals';
import { useToastStore } from '@/store/toast';

const mockRespond = jest.fn<(id: string, accept: boolean) => Promise<void>>();

jest.mock('@/lib/api', () => ({
  fetchBlocked: jest.fn(),
  fetchFriends: jest.fn(),
  fetchOutgoingRequests: jest.fn(),
  fetchPendingRequests: jest.fn(),
  sendFriendRequest: jest.fn(),
  respondToFriendRequest: (id: string, accept: boolean) => mockRespond(id, accept),
}));

jest.mock('@/hooks/use-user-id', () => ({ useUserId: () => 'me' }));
jest.mock('@/lib/push-notifications', () => ({ maybeRequestNotificationPermission: jest.fn() }));
jest.mock('@/lib/haptics', () => ({ successHaptic: jest.fn(), tapHaptic: jest.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useDeclineFriendRequest', () => {
  beforeEach(() => {
    mockRespond.mockReset();
    mockRespond.mockResolvedValue(undefined);
    useToastStore.setState({ toast: null });
    usePendingRemovals.setState({ ids: [] });
  });

  it('hides the request and shows an undo toast without declining yet', async () => {
    const { result } = await renderHook(() => useDeclineFriendRequest(), { wrapper });
    await act(async () => {
      result.current({ requestId: 'r1', name: 'Kim' });
    });
    expect(usePendingRemovals.getState().ids).toEqual(['r1']);
    expect(useToastStore.getState().toast?.message).toBe('Du nekade Kim.');
    expect(useToastStore.getState().toast?.action?.label).toBe('Ångra');
    expect(mockRespond).not.toHaveBeenCalled();
  });

  it('declines when the toast closes', async () => {
    const { result } = await renderHook(() => useDeclineFriendRequest(), { wrapper });
    await act(async () => {
      result.current({ requestId: 'r1', name: 'Kim' });
    });
    await act(async () => {
      useToastStore.getState().dismiss();
    });
    expect(mockRespond).toHaveBeenCalledWith('r1', false);
  });

  it('keeps the request when undone', async () => {
    const { result } = await renderHook(() => useDeclineFriendRequest(), { wrapper });
    await act(async () => {
      result.current({ requestId: 'r1', name: 'Kim' });
    });
    await act(async () => {
      useToastStore.getState().toast?.action?.onPress();
    });
    expect(usePendingRemovals.getState().ids).toEqual([]);
  });
});
