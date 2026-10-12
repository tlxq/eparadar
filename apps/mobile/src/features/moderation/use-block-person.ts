import { blockedText, Common } from '@/constants/strings';
import { useBlockUser } from '@/features/friends/hooks';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { showToast } from '@/store/toast';

export function useBlockPerson() {
  const block = useBlockUser();

  return async function blockPerson(userId: string, name: string | null, title?: string) {
    const ok = await confirmDestructive({
      title: title ?? (name ? `Blockera ${name}?` : 'Blockera personen?'),
      message: blockedText(name),
      confirmLabel: Common.block,
      icon: 'ban-outline',
    });
    if (!ok) return false;
    try {
      await block.mutateAsync(userId);
      showToast({ message: name ? `${name} är blockerad.` : 'Personen är blockerad.' });
      return true;
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
      return false;
    }
  };
}
