import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('expo-splash-screen', () => ({
  hideAsync: () => Promise.resolve(),
}));

import { ErrorFallback } from '@/components/error-fallback';

describe('ErrorFallback', () => {
  it('shows the error screen and lets the user retry', async () => {
    const error = new Error('boom');
    const retry = jest.fn(() => Promise.resolve());

    const screen = await render(<ErrorFallback error={error} retry={retry} />);

    expect(screen.getByText('Något gick snett')).toBeTruthy();

    await fireEvent.press(screen.getByText('Försök igen'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
