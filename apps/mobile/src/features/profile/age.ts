import { useQuery } from '@tanstack/react-query';

import { useUserId } from '@/hooks/use-user-id';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';

export async function fetchMyBirthYear(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('user_ages')
    .select('birth_year')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.birth_year ?? null;
}

export async function saveBirthYear(userId: string, birthYear: number): Promise<void> {
  const { error } = await supabase
    .from('user_ages')
    .insert({ user_id: userId, birth_year: birthYear });
  if (error) throw error;
}

export function useMyBirthYear() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.birthYear(userId),
    queryFn: () => fetchMyBirthYear(userId!),
    enabled: !!userId,
  });
}
