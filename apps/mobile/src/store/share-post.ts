import { create } from 'zustand';

type SharePostState = {
  postId: string | null;
  close: () => void;
};

export const useSharePostStore = create<SharePostState>((set) => ({
  postId: null,
  close: () => set({ postId: null }),
}));

export function openSharePost(postId: string) {
  useSharePostStore.setState({ postId });
}
