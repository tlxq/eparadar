import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

type AuthState = {
  session: Session | null;
  initializing: boolean;
  linkPending: boolean;
  setSession: (session: Session | null) => void;
  setInitializing: (initializing: boolean) => void;
  setLinkPending: (linkPending: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initializing: true,
  linkPending: false,
  setSession: (session) => set({ session }),
  setInitializing: (initializing) => set({ initializing }),
  setLinkPending: (linkPending) => set({ linkPending }),
}));
