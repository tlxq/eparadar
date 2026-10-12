import { create } from 'zustand';

type PendingRemovalsState = {
  ids: string[];
  hide: (id: string) => void;
  show: (id: string) => void;
};

export const usePendingRemovals = create<PendingRemovalsState>((set) => ({
  ids: [],
  hide: (id) => set((state) => ({ ids: [...state.ids, id] })),
  show: (id) => set((state) => ({ ids: state.ids.filter((other) => other !== id) })),
}));

export function useWithoutPendingRemovals<T extends { id: string }>(rows: T[] | undefined) {
  const ids = usePendingRemovals((state) => state.ids);
  return rows?.filter((row) => !ids.includes(row.id));
}
