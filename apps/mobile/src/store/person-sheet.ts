import { router } from 'expo-router';
import { create } from 'zustand';

import { useAuthStore } from '@/store/auth';

type PersonSheetState = {
  userId: string | null;
  fromMap: boolean;
  close: () => void;
};

export const usePersonSheetStore = create<PersonSheetState>((set) => ({
  userId: null,
  fromMap: false,
  close: () => set({ userId: null, fromMap: false }),
}));

export function openPerson(userId: string, options?: { fromMap?: boolean }) {
  if (userId === useAuthStore.getState().session?.user.id) {
    router.navigate('/profile');
    return;
  }
  usePersonSheetStore.setState({ userId, fromMap: !!options?.fromMap });
}

export function openProfile(userId: string) {
  usePersonSheetStore.setState({ userId: null });
  if (userId === useAuthStore.getState().session?.user.id) {
    router.navigate('/profile');
    return;
  }
  router.push({ pathname: '/person/[id]', params: { id: userId } });
}

export function openCar(carId: string) {
  router.push({ pathname: '/cars/[id]', params: { id: carId } });
}
