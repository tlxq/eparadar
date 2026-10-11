import { router } from 'expo-router';
import { create } from 'zustand';

import { useAuthStore } from '@/store/auth';

type PersonSheetState = {
  userId: string | null;
  close: () => void;
};

export const usePersonSheetStore = create<PersonSheetState>((set) => ({
  userId: null,
  close: () => set({ userId: null }),
}));

export function openPerson(userId: string) {
  if (userId === useAuthStore.getState().session?.user.id) {
    router.navigate('/profile');
    return;
  }
  usePersonSheetStore.setState({ userId });
}
