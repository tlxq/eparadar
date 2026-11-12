import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';
import { SIGNED_URL_REFRESH_MS } from '@/lib/queryClient';
import { signedUrl, storagePathFromPublicUrl } from '@/lib/storage';

export function useCarPhotoUrl(photoUrl: string | null | undefined): string | null {
  const path = storagePathFromPublicUrl('car-photos', photoUrl ?? null);
  const { data } = useQuery({
    queryKey: queryKeys.carPhoto(path),
    queryFn: () => signedUrl('car-photos', path!),
    enabled: !!path,
    staleTime: SIGNED_URL_REFRESH_MS,
    refetchInterval: SIGNED_URL_REFRESH_MS,
  });
  return path ? (data ?? null) : (photoUrl ?? null);
}
