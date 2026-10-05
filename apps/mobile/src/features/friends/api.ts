import { supabase } from '@/lib/supabase';

export type MeetupSuggestion = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  shared_meetup_count: number;
  last_meetup_id: string;
  last_meetup_title: string;
  last_checked_in_at: string;
};

export type MutualSuggestion = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  mutual_friend_count: number;
};

export async function fetchMeetupSuggestions(): Promise<MeetupSuggestion[]> {
  const { data, error } = await supabase.rpc('suggested_friends_from_meetups');
  if (error) throw error;
  return (data ?? []) as unknown as MeetupSuggestion[];
}

export async function fetchMutualSuggestions(): Promise<MutualSuggestion[]> {
  const { data, error } = await supabase.rpc('suggested_friends_mutual');
  if (error) throw error;
  return (data ?? []) as unknown as MutualSuggestion[];
}

export async function blockUser(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc('block_user', { target_user_id: targetUserId });
  if (error) throw error;
}

export async function unblockUser(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc('unblock_user', { target_user_id: targetUserId });
  if (error) throw error;
}

export function formatRelativeSwedish(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return 'nyss';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'timme' : 'timmar'} sedan`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'dag' : 'dagar'} sedan`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} ${weeks === 1 ? 'vecka' : 'veckor'} sedan`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? 'månad' : 'månader'} sedan`;
}
