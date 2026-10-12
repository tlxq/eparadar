import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'error';

export type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onPress: () => void };
};

type ToastState = {
  toast: Toast | null;
  show: (toast: Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone }) => void;
  dismiss: () => void;
};

let nextId = 1;

export function withFullStop(message: string) {
  const trimmed = message.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: ({ tone = 'info', ...toast }) =>
    set({ toast: { ...toast, message: withFullStop(toast.message), tone, id: nextId++ } }),
  dismiss: () => set({ toast: null }),
}));

export function showToast(toast: Parameters<ToastState['show']>[0]) {
  useToastStore.getState().show(toast);
}
