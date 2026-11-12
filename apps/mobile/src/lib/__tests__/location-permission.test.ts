import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockConfirm = jest.fn<(options: unknown) => Promise<boolean>>();
const mockGetForeground = jest.fn<() => Promise<unknown>>();
const mockRequestForeground = jest.fn<() => Promise<unknown>>();
const mockGetBackground = jest.fn<() => Promise<unknown>>();
const mockRequestBackground = jest.fn<() => Promise<unknown>>();
const mockStartUpdates = jest.fn<() => Promise<void>>();
const mockIsRegistered = jest.fn<() => Promise<boolean>>();

jest.mock('@/lib/confirm', () => ({ confirm: (options: unknown) => mockConfirm(options) }));
jest.mock('@/lib/api', () => ({ upsertLocation: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: () => mockIsRegistered(),
}));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: () => mockGetForeground(),
  requestForegroundPermissionsAsync: () => mockRequestForeground(),
  getBackgroundPermissionsAsync: () => mockGetBackground(),
  requestBackgroundPermissionsAsync: () => mockRequestBackground(),
  startLocationUpdatesAsync: () => mockStartUpdates(),
}));

import { requestLocationPermissions, startLocationSharing } from '@/lib/location-task';

const granted = { status: 'granted', canAskAgain: true };
const askable = { status: 'undetermined', canAskAgain: true };
const blocked = { status: 'denied', canAskAgain: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockConfirm.mockResolvedValue(true);
  mockIsRegistered.mockResolvedValue(false);
});

describe('requestLocationPermissions', () => {
  it('works with foreground permission only', async () => {
    mockGetForeground.mockResolvedValue(askable);
    mockRequestForeground.mockResolvedValue(granted);
    mockGetBackground.mockResolvedValue(askable);
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const result = await requestLocationPermissions();

    expect(result).toEqual({ granted: true, background: false });
    expect(mockConfirm).toHaveBeenCalledTimes(2);
    expect(mockRequestBackground).not.toHaveBeenCalled();
  });

  it('shows the explainer before the system dialog', async () => {
    const order: string[] = [];
    mockGetForeground.mockResolvedValue(askable);
    mockConfirm.mockImplementation(async () => {
      order.push('confirm');
      return true;
    });
    mockRequestForeground.mockImplementation(async () => {
      order.push('system');
      return granted;
    });
    mockGetBackground.mockResolvedValue(granted);

    await requestLocationPermissions();

    expect(order).toEqual(['confirm', 'system']);
  });

  it('upgrades to background only when the person says yes', async () => {
    mockGetForeground.mockResolvedValue(askable);
    mockRequestForeground.mockResolvedValue(granted);
    mockGetBackground.mockResolvedValue(askable);
    mockRequestBackground.mockResolvedValue(granted);

    const result = await requestLocationPermissions();

    expect(result).toEqual({ granted: true, background: true });
    expect(mockRequestBackground).toHaveBeenCalledTimes(1);
  });

  it('does not ask again when foreground is already granted', async () => {
    mockGetForeground.mockResolvedValue(granted);
    mockGetBackground.mockResolvedValue(askable);

    const result = await requestLocationPermissions();

    expect(result).toEqual({ granted: true, background: false });
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockRequestForeground).not.toHaveBeenCalled();
  });

  it('stops quietly when the explainer is cancelled', async () => {
    mockGetForeground.mockResolvedValue(askable);
    mockConfirm.mockResolvedValue(false);

    const result = await requestLocationPermissions();

    expect(result).toMatchObject({ granted: false, cancelled: true, blocked: false });
    expect(mockRequestForeground).not.toHaveBeenCalled();
  });

  it('reports a denied system dialog without blocking', async () => {
    mockGetForeground.mockResolvedValue(askable);
    mockRequestForeground.mockResolvedValue({ status: 'denied', canAskAgain: true });

    const result = await requestLocationPermissions();

    expect(result).toMatchObject({ granted: false, blocked: false, cancelled: false });
  });

  it('points to settings when the permission is blocked', async () => {
    mockGetForeground.mockResolvedValue(blocked);

    const result = await requestLocationPermissions();

    expect(result).toMatchObject({ granted: false, blocked: true });
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockRequestForeground).not.toHaveBeenCalled();
  });
});

describe('startLocationSharing', () => {
  it('does not start the background task without background permission', async () => {
    mockGetBackground.mockResolvedValue(askable);

    await startLocationSharing();

    expect(mockStartUpdates).not.toHaveBeenCalled();
  });

  it('starts the background task with background permission', async () => {
    mockGetBackground.mockResolvedValue(granted);

    await startLocationSharing();

    expect(mockStartUpdates).toHaveBeenCalledTimes(1);
  });
});
