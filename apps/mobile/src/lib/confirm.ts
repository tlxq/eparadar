import { useConfirmStore, type ConfirmRequest } from '@/store/confirm';

type ConfirmOptions = Omit<ConfirmRequest, 'resolve'>;

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().open({ ...options, resolve });
  });
}

export function confirmDestructive(options: Omit<ConfirmOptions, 'destructive'>) {
  return confirm({ ...options, destructive: true });
}
