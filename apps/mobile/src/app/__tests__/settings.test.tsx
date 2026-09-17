import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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
const mockUpsertLocation = jest.fn();

jest.mock('@/lib/api', () => ({
  fetchMyLocation: (...args: unknown[]) => mockFetchMyLocation(...args),
  setLocationSharing: (...args: unknown[]) => mockSetLocationSharing(...args),
  upsertLocation: (...args: unknown[]) => mockUpsertLocation(...args),
}));

const mockRequestLocationPermissions = jest.fn();
const mockStartLocationSharing = jest.fn();
const mockStopLocationSharing = jest.fn();

jest.mock('@/lib/location-task', () => ({
  requestLocationPermissions: (...args: unknown[]) => mockRequestLocationPermissions(...args),
  startLocationSharing: (...args: unknown[]) => mockStartLocationSharing(...args),
  stopLocationSharing: (...args: unknown[]) => mockStopLocationSharing(...args),
}));

jest.mock('expo-location', () => ({
  getLastKnownPositionAsync: jest.fn(),
  getBackgroundPermissionsAsync: jest.fn(),
}));

import * as Location from 'expo-location';
import SettingsScreen from '@/app/settings';

async function renderSettings() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SettingsScreen />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValue({
    status: 'granted',
  } as never);
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

    const { findByTestId } = await renderSettings();
    const toggle = await findByTestId('sharing-toggle');
    expect(toggle.props.value).toBe(false);

    fireEvent(toggle, 'valueChange', true);

    await waitFor(() => expect(mockUpsertLocation).toHaveBeenCalledTimes(1));
    expect(mockRequestLocationPermissions).toHaveBeenCalledTimes(1);
    expect(mockUpsertLocation).toHaveBeenCalledWith({
      userId: 'user-1',
      lat: 59.3,
      lng: 18.1,
      sharingEnabled: true,
    });
    expect(mockStartLocationSharing).toHaveBeenCalledTimes(1);
  });

  it('shows an error and does not enable sharing when no cached location exists', async () => {
    mockFetchMyLocation.mockResolvedValue(null as never);
    mockRequestLocationPermissions.mockResolvedValue({ granted: true } as never);
    jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue(null);

    const { findByTestId, findByText } = await renderSettings();
    const toggle = await findByTestId('sharing-toggle');

    fireEvent(toggle, 'valueChange', true);

    await findByText('epaRadar kunde inte hitta en aktuell plats. Öppna kartan och försök igen.');
    expect(mockUpsertLocation).not.toHaveBeenCalled();
    expect(mockStartLocationSharing).not.toHaveBeenCalled();
  });

  it('shows the Swedish denial reason and never upserts when permission is denied', async () => {
    mockFetchMyLocation.mockResolvedValue(null as never);
    mockRequestLocationPermissions.mockResolvedValue({
      granted: false,
      reason: 'epaRadar behöver åtkomst till din plats för att kunna visa dig på kartan.',
    } as never);

    const { findByTestId, findByText } = await renderSettings();
    const toggle = await findByTestId('sharing-toggle');

    fireEvent(toggle, 'valueChange', true);

    await findByText('epaRadar behöver åtkomst till din plats för att kunna visa dig på kartan.');
    expect(mockUpsertLocation).not.toHaveBeenCalled();
    expect(mockStartLocationSharing).not.toHaveBeenCalled();
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

    const { findByTestId } = await renderSettings();
    const toggle = await findByTestId('sharing-toggle');
    await waitFor(() => expect(toggle.props.value).toBe(true));

    fireEvent(toggle, 'valueChange', false);

    await waitFor(() => expect(mockSetLocationSharing).toHaveBeenCalledWith('user-1', false));
    expect(mockStopLocationSharing).toHaveBeenCalledTimes(1);
    expect(mockUpsertLocation).not.toHaveBeenCalled();
  });
});
