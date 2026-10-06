import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type { Profile } from '@/lib/api';

type DbTables = Database['public']['Tables'];

const HERE_NOW_WINDOW_MINUTES = 30;
const RECENT_PAST_HOURS = 3;

export type Meetup = {
  id: string;
  creator_id: string;
  title: string;
  vibe_emoji: string;
  lat: number;
  lng: number;
  starts_at: string;
  interest_count: number;
  here_now_count: number;
};

export type MeetupDetail = Meetup & {
  creator: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
  interested: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[];
  hereNow: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[];
  isInterested: boolean;
};

export async function fetchMeetups(): Promise<Meetup[]> {
  const cutoff = new Date(Date.now() - RECENT_PAST_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('meetups_with_stats')
    .select('*')
    .gte('starts_at', cutoff)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Meetup[];
}

export async function fetchMeetupDetail(meetupId: string, myUserId: string): Promise<MeetupDetail> {
  const hereCutoff = new Date(Date.now() - HERE_NOW_WINDOW_MINUTES * 60 * 1000).toISOString();

  // Fetched separately from meetups_with_stats rather than embedded (`creator:profiles(...)`)
  // — PostgREST doesn't reliably resolve embedded relationships through a view the way it
  // does through a base table, and a failed embed here would leave the screen spinning forever.
  const [meetupRes, creatorRes, interestedRes, hereNowRes, myInterestRes] = await Promise.all([
    supabase.from('meetups_with_stats').select('*').eq('id', meetupId).single(),
    supabase
      .from('meetups')
      .select('creator:profiles!meetups_creator_id_fkey(id, display_name, avatar_url)')
      .eq('id', meetupId)
      .single(),
    supabase
      .from('meetup_interests')
      .select('profile:profiles(id, display_name, avatar_url)')
      .eq('meetup_id', meetupId),
    supabase
      .from('meetup_checkins')
      .select('profile:profiles(id, display_name, avatar_url)')
      .eq('meetup_id', meetupId)
      .gte('checked_in_at', hereCutoff),
    supabase
      .from('meetup_interests')
      .select('user_id')
      .eq('meetup_id', meetupId)
      .eq('user_id', myUserId)
      .maybeSingle(),
  ]);

  if (meetupRes.error) {
    console.error('[fetchMeetupDetail] meetup', meetupRes.error);
    throw meetupRes.error;
  }
  if (creatorRes.error) {
    console.error('[fetchMeetupDetail] creator', creatorRes.error);
    throw creatorRes.error;
  }
  if (interestedRes.error) {
    console.error('[fetchMeetupDetail] interested', interestedRes.error);
    throw interestedRes.error;
  }
  if (hereNowRes.error) {
    console.error('[fetchMeetupDetail] hereNow', hereNowRes.error);
    throw hereNowRes.error;
  }
  if (myInterestRes.error) {
    console.error('[fetchMeetupDetail] myInterest', myInterestRes.error);
    throw myInterestRes.error;
  }

  return {
    ...(meetupRes.data as Meetup),
    creator: creatorRes.data.creator as MeetupDetail['creator'],
    interested: (interestedRes.data ?? []).map((row) => row.profile) as MeetupDetail['interested'],
    hereNow: (hereNowRes.data ?? []).map((row) => row.profile) as MeetupDetail['hereNow'],
    isInterested: !!myInterestRes.data,
  };
}

export async function createMeetup(input: {
  creatorId: string;
  title: string;
  vibeEmoji: string;
  lat: number;
  lng: number;
  startsAt: string;
}): Promise<Meetup> {
  const payload: DbTables['meetups']['Insert'] = {
    creator_id: input.creatorId,
    title: input.title,
    vibe_emoji: input.vibeEmoji,
    lat: input.lat,
    lng: input.lng,
    starts_at: input.startsAt,
  };
  const { data, error } = await supabase.from('meetups').insert(payload).select().single();
  if (error) throw error;
  return { ...data, interest_count: 0, here_now_count: 0 };
}

export async function deleteMeetup(meetupId: string): Promise<void> {
  const { data, error } = await supabase.from('meetups').delete().eq('id', meetupId).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Bara den som skapade träffen kan ta bort den.');
}

export async function setInterested(
  meetupId: string,
  userId: string,
  interested: boolean,
): Promise<void> {
  if (interested) {
    const { error } = await supabase
      .from('meetup_interests')
      .insert({ meetup_id: meetupId, user_id: userId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('meetup_interests')
      .delete()
      .eq('meetup_id', meetupId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}

/** Idempotent "mark interested" for the long-press-on-a-pin gesture — never errors on a repeat press. */
export async function markInterested(meetupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('meetup_interests')
    .upsert(
      { meetup_id: meetupId, user_id: userId },
      { onConflict: 'meetup_id,user_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function checkInAtMeetup(
  meetupId: string,
  lat: number,
  lng: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_in_at_meetup', {
    p_meetup_id: meetupId,
    p_lat: lat,
    p_lng: lng,
  });
  if (error) throw error;
  return !!data;
}
