import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useUserId } from '@/hooks/use-user-id';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';

import type { ReportTargetType } from './api';

export type AdminReport = {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  details: string | null;
  snapshot: string | null;
  created_at: string;
  reported_user_id: string | null;
  reported_username: string | null;
  reported_display_name: string | null;
};

export const TARGET_LABELS: Record<ReportTargetType, string> = {
  post: 'Post',
  message: 'Chattmeddelande',
  profile: 'Profil',
  spot: 'Spot',
  spot_photo: 'Bild på spot',
  meetup: 'Meet',
  status: 'Status',
  conversation: 'Grupp',
};

export function canRemove(type: ReportTargetType): boolean {
  return type !== 'profile';
}

async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) throw error;
  return data === true;
}

async function fetchOpenReports(): Promise<AdminReport[]> {
  const { data, error } = await supabase.rpc('admin_open_reports');
  if (error) throw error;
  return (data ?? []) as AdminReport[];
}

export function useIsAdmin() {
  const userId = useUserId();
  return useQuery({
    queryKey: queryKeys.isAdmin(userId),
    queryFn: fetchIsAdmin,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOpenReports() {
  return useQuery({ queryKey: queryKeys.adminReports(), queryFn: fetchOpenReports });
}

export function useMarkHandled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase.rpc('admin_mark_report_handled', {
        p_report_id: reportId,
      });
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminReports() }),
  });
}

export function useRemoveReported() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase.rpc('admin_remove_reported_content', {
        p_report_id: reportId,
      });
      if (error) throw error;
      return data === true;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminReports() }),
  });
}
