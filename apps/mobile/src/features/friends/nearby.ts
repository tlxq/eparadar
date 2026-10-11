import type { RpcRow } from '@/lib/db-types';
import { supabase } from '@/lib/supabase';

export type NearbyRequestState = 'none' | 'sent' | 'received';

export type NearbyPerson = Omit<RpcRow<'scan_nearby'>, 'request_state'> & {
  request_state: NearbyRequestState;
};

export async function scanNearby(lat: number, lng: number): Promise<NearbyPerson[]> {
  const { data, error } = await supabase.rpc('scan_nearby', { p_lat: lat, p_lng: lng });
  if (error) throw error;
  return (data ?? []) as NearbyPerson[];
}

export async function leaveNearby(): Promise<void> {
  const { error } = await supabase.rpc('leave_nearby');
  if (error) throw error;
}
