import { create } from 'zustand';

export const TYPING_TTL_MS = 4000;

type Typist = { name: string; at: number };

type TypingState = {
  byConversation: Record<string, Record<string, Typist>>;
  mark: (conversationId: string, userId: string, name: string) => void;
  clear: (conversationId: string, userId: string) => void;
};

export const useTypingStore = create<TypingState>((set) => ({
  byConversation: {},
  mark: (conversationId, userId, name) =>
    set((state) => ({
      byConversation: {
        ...state.byConversation,
        [conversationId]: {
          ...state.byConversation[conversationId],
          [userId]: { name, at: Date.now() },
        },
      },
    })),
  clear: (conversationId, userId) =>
    set((state) => {
      const current = { ...state.byConversation[conversationId] };
      delete current[userId];
      return { byConversation: { ...state.byConversation, [conversationId]: current } };
    }),
}));

export function activeTypists(
  typists: Record<string, Typist> | undefined,
  myUserId: string | undefined,
  now: number,
): Typist[] {
  return Object.entries(typists ?? {})
    .filter(([userId, typist]) => userId !== myUserId && now - typist.at < TYPING_TTL_MS)
    .map(([, typist]) => typist);
}

export function typingLabel(typists: Typist[], isGroup: boolean): string | null {
  if (typists.length === 0) return null;
  if (!isGroup) return 'skriver…';
  if (typists.length === 1) return `${typists[0].name.split(' ')[0]} skriver…`;
  return `${typists.length} skriver…`;
}
