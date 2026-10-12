import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/hooks/use-user-id';
import {
  fetchNotificationSettings,
  setNotificationSetting,
  type NotificationKind,
  type NotificationSettings,
} from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

export function useNotificationSettings() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.notificationSettings(userId),
    queryFn: () => fetchNotificationSettings(userId!),
    enabled: !!userId,
  });
}

export function useSetNotificationSetting() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const key = queryKeys.notificationSettings(userId);

  return useMutation({
    mutationFn: ({ kind, enabled }: { kind: NotificationKind; enabled: boolean }) =>
      setNotificationSetting(userId!, kind, enabled),
    onMutate: async ({ kind, enabled }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationSettings>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, [kind]: enabled });
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      showToast({ tone: 'error', message: getErrorMessage(error) });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
