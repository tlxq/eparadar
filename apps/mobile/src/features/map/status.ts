import { supabase } from '@/lib/supabase';

export const STATUS_MAX_LENGTH = 30;

export const STATUS_PRESETS = ['Ute och rullar', 'På Max', 'Tankar', 'Mekar', 'Hemma'];

export type HeatCell = { lat: number; lng: number; people: number };

export async function setMapStatus(userId: string, text: string | null): Promise<void> {
  const value = text?.trim() ? text.trim().slice(0, STATUS_MAX_LENGTH) : null;
  const { data, error } = await supabase
    .from('locations')
    .update({ status_text: value })
    .eq('user_id', userId)
    .select('user_id');
  if (error) throw error;
  if (!data?.length) {
    throw new Error('Slå på platsdelning först, så kan dina kompisar se din status.');
  }
}

export async function fetchEveningHeat(): Promise<HeatCell[]> {
  const { data, error } = await supabase.rpc('evening_heat');
  if (error) throw error;
  return data ?? [];
}
