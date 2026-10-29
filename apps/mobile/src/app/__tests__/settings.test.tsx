import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    require('react').useEffect(() => {
      effect();
    }, [effect]);
  },
}));

jest.mock('@/store/auth', () => ({
  useAuthStore: (selector: (state: { session: { user: { id: string } } }) => unknown) =>
    selector({ session: { user: { id: 'user-1' } } }),
}));

const mockFetchMyLocation = jest.fn();
const mockSetLocationSharing = jest.fn();
const mockSetLocationApproximate = jest.fn();
const mockUpsertLocation = jest.fn();
const mockFetchNotificationSettings = jest.fn();
const mockSetNotificationSetting = jest.fn();
const mockFetchBlocked = jest.fn();

jest.mock('@/lib/api', () => ({
  fetchMyLocation: (...args: unknown[]) => mockFetchMyLocation(...args),
  setLocationSharing: (...args: unknown[]) => mockSetLocationSharing(...args),
  setLocationApproximate: (...args: unknown[]) => mockSetLocationApproximate(...args),
  upsertLocation: (...args: unknown[]) => mockUpsertLocation(...args),
  fetchNotificationSettings: (...args: unknown[]) => mockFetchNotificationSettings(...args),
  setNotificationSetting: (...args: unknown[]) => mockSetNotificationSetting(...args),
  fetchBlocked: (...args: unknown[]) => mockFetchBlocked(...args),
  signOut: jest.fn(),
}));

const mockRequestLocationPermissions = jest.fn();
const mockStartLocationSharing = jest.fn();
const mockStopLocationSharing = jest.fn();

jest.mock('@/lib/location-task', () => ({
  requestLocationPermissions: (...args: unknown[]) => mockRequestLocationPermissions(...args),
  startLocationSharing: (...args: unknown[]) => mockStartLocationSharing(...args),
  stopLocationSharing: (...args: unknown[]) => mockStopLocationSharing(...args),
  stopLocationSharingQuietly: jest.fn(),
}));

jest.mock('expo-location', () => ({
  getLastKnownPositionAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
}));

import * as Location from 'expo-location';
import SettingsScreen from '@/app/settings';

async function renderSettings() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const screen = await render(
    <QueryClientProvider client={client}>
      <SettingsScreen />
    </QueryClientProvider>,
  );
  return { client, screen };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
    status: 'granted',
  } as never);
  mockFetchNotificationSettings.mockResolvedValue({
    messages: true,
    friend_requests: true,
    meets: true,
  } as never);
  mockFetchBlocked.mockResolvedValue([] as never);
});

describe('SettingsScreen sharing toggle', () => {
  it('requests permission and upserts a shared location when enabled', async () => {
    mockFetchMyLocation.mockResolvedValue(null as never);
    mockRequestLocationPermissions.mockResolvedValue({ granted: true } as never);
    jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue({
      coords: { latitude: 59.3, longitude: 18.1 },
    } as never);
    mockUpsertLocation.mockResolvedValue(undefined as never);
    mockStartLocationSharing.mockResolvedValue(undefined as never);

    const { client, screen } = await renderSettings();
    const { findByTestId, unmount } = screen;
    const toggle = await findByTestId('sharing-toggle');
    expect(toggle.props.value).toBe(false);

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    await waitFor(() => expect(mockUpsertLocation).toHaveBeenCalledTimes(1));
    expect(mockRequestLocationPermissions).toHaveBeenCalledTimes(1);
    expect(mockUpsertLocation).toHaveBeenCalledWith({
      userId: 'user-1',
      lat: 59.3,
      lng: 18.1,
      sharingEnabled: true,
    });
    expect(mockStartLocationSharing).toHaveBeenCalledTimes(1);
    await unmount();
    client.clear();
  });

  it('shows an error and does not enable sharing when no cached location exists', async () => {
    mockFetchMyLocation.mockResolvedValue(null as never);
    mockRequestLocationPermissions.mockResolvedValue({ granted: true } as never);
    jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(null);

    const { client, screen } = await renderSettings();
    const { findByTestId, findByText, unmount } = screen;
    const toggle = await findByTestId('sharing-toggle');

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    await findByText('epaRadar kunde inte hitta en aktuell plats. Öppna kartan och försök igen.');
    expect(mockUpsertLocation).not.toHaveBeenCalled();
    expect(mockStartLocationSharing).not.toHaveBeenCalled();
    await unmount();
    client.clear();
  });

  it('shows the Swedish denial reason and never upserts when permission is denied', async () => {
    mockFetchMyLocation.mockResolvedValue(null as never);
    mockRequestLocationPermissions.mockResolvedValue({
      granted: false,
      reason: 'epaRadar behöver åtkomst till din plats för att kunna visa dig på kartan.',
    } as never);

    const { client, screen } = await renderSettings();
    const { findByTestId, findByText, unmount } = screen;
    const toggle = await findByTestId('sharing-toggle');

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    await findByText('epaRadar behöver åtkomst till din plats för att kunna visa dig på kartan.');
    expect(mockUpsertLocation).not.toHaveBeenCalled();
    expect(mockStartLocationSharing).not.toHaveBeenCalled();
    await unmount();
    client.clear();
  });

  it('stops sharing and persists the off-state when disabled', async () => {
    mockFetchMyLocation.mockResolvedValue({
      user_id: 'user-1',
      lat: 59.3,
      lng: 18.1,
      sharing_enabled: true,
      updated_at: new Date().toISOString(),
    } as never);
    mockStopLocationSharing.mockResolvedValue(undefined as never);
    mockSetLocationSharing.mockResolvedValue(undefined as never);

    const { client, screen } = await renderSettings();
    const { findByTestId, unmount } = screen;
    const toggle = await findByTestId('sharing-toggle');
    await waitFor(() => expect(toggle.props.value).toBe(true));

    await act(async () => {
      fireEvent(toggle, 'valueChange', false);
    });

    await waitFor(() => expect(mockSetLocationSharing).toHaveBeenCalledWith('user-1', false));
    expect(mockStopLocationSharing).toHaveBeenCalledTimes(1);
    expect(mockUpsertLocation).not.toHaveBeenCalled();
    await unmount();
    client.clear();
  });
});

describe('SettingsScreen approximate toggle', () => {
  it('is disabled while sharing is off', async () => {
    mockFetchMyLocation.mockResolvedValue(null as never);

    const { client, screen } = await renderSettings();
    const { findByTestId, unmount } = screen;
    const toggle = await findByTestId('approximate-toggle');

    expect(toggle.props.disabled).toBe(true);
    expect(toggle.props.value).toBe(false);
    await unmount();
    client.clear();
  });

  it('reflects the stored value and can be turned on while sharing is enabled', async () => {
    mockFetchMyLocation.mockResolvedValue({
      user_id: 'user-1',
      lat: 59.3,
      lng: 18.1,
      sharing_enabled: true,
      approximate_enabled: false,
      updated_at: new Date().toISOString(),
    } as never);
    mockSetLocationApproximate.mockResolvedValue(undefined as never);

    const { client, screen } = await renderSettings();
    const { findByTestId, unmount } = screen;
    const toggle = await findByTestId('approximate-toggle');
    await waitFor(() => expect(toggle.props.disabled).toBe(false));

    await act(async () => {
      fireEvent(toggle, 'valueChange', true);
    });

    await waitFor(() => expect(mockSetLocationApproximate).toHaveBeenCalledWith('user-1', true));
    await unmount();
    client.clear();
  });
});

describe('SettingsScreen notifications and blocked', () => {
  it('turns off one notification type', async () => {
    mockFetchMyLocation.mockResolvedValue(null as never);
    mockSetNotificationSetting.mockResolvedValue(undefined as never);

    const { client, screen } = await renderSettings();
    const { findByTestId, unmount } = screen;
    const toggle = await findByTestId('notify-meets');
    await waitFor(() => expect(toggle.props.value).toBe(true));

    await act(async () => {
      fireEvent(toggle, 'valueChange', false);
    });

    await waitFor(() =>
      expect(mockSetNotificationSetting).toHaveBeenCalledWith('user-1', 'meets', false),
    );
    await unmount();
    client.clear();
  });

  it('shows the empty blocked text', async () => {
    mockFetchMyLocation.mockResolvedValue(null as never);

    const { client, screen } = await renderSettings();
    const { findByText, unmount } = screen;
    await findByText('Du har inte blockerat någon.');
    await unmount();
    client.clear();
  });
});
