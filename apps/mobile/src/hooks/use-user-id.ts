import { useAuthStore } from '@/store/auth';

export function useUserId() {
  return useAuthStore((state) => state.session?.user.id);
}
