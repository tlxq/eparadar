import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { MAP_LOAD_TIMEOUT_MS, useMapLoadTimeout } from '@/features/map/use-map-load-timeout';

describe('useMapLoadTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('times out when the map is not ready in time', async () => {
    const { result } = await renderHook(() => useMapLoadTimeout(false, 0));
    expect(result.current).toBe(false);
    await act(async () => {
      jest.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS);
    });
    expect(result.current).toBe(true);
  });

  it('never times out once the map is ready', async () => {
    const { result, rerender } = await renderHook(
      ({ ready }: { ready: boolean }) => useMapLoadTimeout(ready, 0),
      { initialProps: { ready: false } },
    );
    await rerender({ ready: true });
    await act(async () => {
      jest.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS * 2);
    });
    expect(result.current).toBe(false);
  });

  it('starts over after a retry', async () => {
    const { result, rerender } = await renderHook(
      ({ attempt }: { attempt: number }) => useMapLoadTimeout(false, attempt),
      { initialProps: { attempt: 0 } },
    );
    await act(async () => {
      jest.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS);
    });
    expect(result.current).toBe(true);
    await rerender({ attempt: 1 });
    expect(result.current).toBe(false);
    await act(async () => {
      jest.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS);
    });
    expect(result.current).toBe(true);
  });
});
