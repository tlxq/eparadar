import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type RadarIgnoreState = {
  ignored: string[];
  ignore: (userId: string) => void;
  unignore: (userId: string) => void;
};

export const useRadarIgnoreStore = create<RadarIgnoreState>()(
  persist(
    (set) => ({
      ignored: [],
      ignore: (userId) =>
        set((state) =>
          state.ignored.includes(userId) ? state : { ignored: [...state.ignored, userId] },
        ),
      unignore: (userId) =>
        set((state) => ({ ignored: state.ignored.filter((id) => id !== userId) })),
    }),
    {
      name: 'radar-ignored',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ ignored: state.ignored }),
    },
  ),
);
