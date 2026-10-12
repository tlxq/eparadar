import { create } from 'zustand';

import { Common } from '@/constants/strings';

export type ToastTone = 'info' | 'success' | 'error';

export type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
  action?: { label: string; onPress: () => void };
  onClose?: () => void;
};

type ToastInput = Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone };

type ToastState = {
  toast: Toast | null;
  show: (toast: ToastInput) => void;
  dismiss: () => void;
  pressAction: () => void;
};

let nextId = 1;

export function withFullStop(message: string) {
  const trimmed = message.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toast: null,
  show: ({ tone = 'info', ...toast }) => {
    const previous = get().toast;
    set({ toast: { ...toast, message: withFullStop(toast.message), tone, id: nextId++ } });
    previous?.onClose?.();
  },
  dismiss: () => {
    const current = get().toast;
    set({ toast: null });
    current?.onClose?.();
  },
  pressAction: () => {
    const current = get().toast;
    set({ toast: null });
    current?.action?.onPress();
  },
}));

export function showToast(toast: ToastInput) {
  useToastStore.getState().show(toast);
}

type UndoOptions = {
  message: string;
  onUndo: () => void;
  onCommit?: () => void | Promise<void>;
};

export function showUndoToast({ message, onUndo, onCommit }: UndoOptions) {
  showToast({
    message,
    action: { label: Common.undo, onPress: onUndo },
    onClose: onCommit
      ? () => {
          void onCommit();
        }
      : undefined,
  });
}
