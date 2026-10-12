import type { QueryClient } from '@tanstack/react-query';

import { leaveConversation, MUTE_FOREVER, setConversationMute } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

export type MuteChoice = '1h' | '8h' | 'forever';

export const MUTE_CHOICES: { key: MuteChoice; label: string }[] = [
  { key: '1h', label: '1 timme' },
  { key: '8h', label: '8 timmar' },
  { key: 'forever', label: 'Tills jag slår på' },
];

const HOUR_MS = 60 * 60 * 1000;

function muteUntil(choice: MuteChoice) {
  if (choice === 'forever') return MUTE_FOREVER;
  return new Date(Date.now() + (choice === '1h' ? 1 : 8) * HOUR_MS);
}

function mutedToast(choice: MuteChoice) {
  if (choice === 'forever') return 'Tystad tills du slår på ljudet igen.';
  return choice === '1h' ? 'Tystad i 1 timme.' : 'Tystad i 8 timmar.';
}

export async function muteConversation(
  queryClient: QueryClient,
  userId: string | undefined,
  conversationId: string,
  choice: MuteChoice | null,
) {
  try {
    await setConversationMute(conversationId, choice ? muteUntil(choice) : null);
    showToast({ message: choice ? mutedToast(choice) : 'Ljudet är på igen!' });
  } catch (error) {
    showToast({ tone: 'error', message: getErrorMessage(error) });
  } finally {
    queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
  }
}

export async function confirmLeaveGroup(
  queryClient: QueryClient,
  userId: string | undefined,
  conversationId: string,
  title: string,
): Promise<boolean> {
  const ok = await confirmDestructive({
    title: 'Lämna gruppen?',
    message:
      'Du slutar få meddelanden från gruppen. Någon som är kvar kan lägga till dig igen senare.',
    confirmLabel: 'Lämna',
    icon: 'exit-outline',
  });
  if (!ok) return false;
  try {
    await leaveConversation(conversationId);
  } catch (error) {
    showToast({ tone: 'error', message: getErrorMessage(error) });
    return false;
  }
  queryClient.removeQueries({ queryKey: queryKeys.conversation(conversationId) });
  queryClient.removeQueries({ queryKey: queryKeys.messages(conversationId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) });
  showToast({ message: `Du har lämnat ${title}.` });
  return true;
}
