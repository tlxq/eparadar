import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  resolve: (ok: boolean) => void;
};

type ConfirmState = {
  request: ConfirmRequest | null;
  open: (request: ConfirmRequest) => void;
  answer: (ok: boolean) => void;
};

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  request: null,
  open: (request) => {
    get().request?.resolve(false);
    set({ request });
  },
  answer: (ok) => {
    const current = get().request;
    set({ request: null });
    current?.resolve(ok);
  },
}));
