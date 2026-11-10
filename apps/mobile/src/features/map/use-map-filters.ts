import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type MapLayer = 'friends' | 'ragg' | 'meets' | 'warnings';

const MAP_LAYERS: MapLayer[] = ['friends', 'ragg', 'meets', 'warnings'];

const FILTERS_KEY = 'eparadar.map.hiddenLayers';

type MapFiltersState = {
  hidden: MapLayer[];
  loaded: boolean;
  toggle: (layer: MapLayer) => void;
  load: () => Promise<void>;
};

export const useMapFilters = create<MapFiltersState>((set, get) => ({
  hidden: [],
  loaded: false,
  toggle: (layer) => {
    const current = get().hidden;
    const hidden = current.includes(layer)
      ? current.filter((item) => item !== layer)
      : [...current, layer];
    set({ hidden });
    AsyncStorage.setItem(FILTERS_KEY, JSON.stringify(hidden)).catch(() => undefined);
  },
  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await AsyncStorage.getItem(FILTERS_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const hidden = Array.isArray(parsed)
        ? parsed.filter((item): item is MapLayer => MAP_LAYERS.includes(item as MapLayer))
        : [];
      set({ hidden, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));

export function visibleLayers<
  T extends {
    friends: unknown[];
    meetups: unknown[];
    spots: { kind: string }[];
  },
>(layers: T, hidden: MapLayer[]): T {
  if (!hidden.length) return layers;
  return {
    ...layers,
    friends: hidden.includes('friends') ? [] : layers.friends,
    meetups: hidden.includes('meets') ? [] : layers.meetups,
    spots: layers.spots.filter((spot) =>
      spot.kind === 'varning' ? !hidden.includes('warnings') : !hidden.includes('ragg'),
    ),
  };
}
