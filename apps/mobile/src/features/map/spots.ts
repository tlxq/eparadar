import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Spot = Database['public']['Tables']['spots']['Row'];

export type SpotKind = 'ragg' | 'varning';
export type WarningType = 'vagarbete' | 'halka' | 'grop' | 'avstangt';
export type SpotVisibility = 'friends' | 'all';

export const WARNING_TYPES: { key: WarningType; label: string }[] = [
  { key: 'vagarbete', label: 'Vägarbete' },
  { key: 'halka', label: 'Halka' },
  { key: 'grop', label: 'Dålig väg' },
  { key: 'avstangt', label: 'Avstängt' },
];

export const HERE_NOW_RADIUS_M = 100;

export function warningLabel(type: string | null): string {
  return WARNING_TYPES.find((warning) => warning.key === type)?.label ?? 'Varning';
}

export function spotTitle(spot: Pick<Spot, 'kind' | 'name' | 'warning_type'>): string {
  return spot.kind === 'ragg' ? (spot.name ?? 'Raggställe') : warningLabel(spot.warning_type);
}

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function countHereNow(
  spot: { lat: number; lng: number },
  people: { lat: number; lng: number }[],
): number {
  return people.filter((person) => distanceMeters(spot, person) <= HERE_NOW_RADIUS_M).length;
}

export async function fetchSpots(): Promise<Spot[]> {
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSpot(input: {
  creatorId: string;
  kind: SpotKind;
  lat: number;
  lng: number;
  visibility: SpotVisibility;
  name?: string;
  warningType?: WarningType;
}): Promise<void> {
  const { error } = await supabase.from('spots').insert({
    creator_id: input.creatorId,
    kind: input.kind,
    lat: input.lat,
    lng: input.lng,
    visibility: input.visibility,
    name: input.kind === 'ragg' ? (input.name?.trim() ?? null) : null,
    warning_type: input.kind === 'varning' ? (input.warningType ?? null) : null,
  });
  if (error) throw error;
}

export async function deleteSpot(spotId: string): Promise<void> {
  const { error } = await supabase.from('spots').delete().eq('id', spotId);
  if (error) throw error;
}
