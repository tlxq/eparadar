import type { Database } from '@/lib/database.types';
import { uploadFile } from '@/lib/image-upload';
import { supabase } from '@/lib/supabase';

export type Spot = Database['public']['Tables']['spots']['Row'];
export type SpotPhotoRow = Database['public']['Tables']['spot_photos']['Row'];
export type SpotPhoto = SpotPhotoRow & { url: string | null };

export type SpotKind = 'ragg' | 'varning';
export type WarningType = 'vagarbete' | 'halka' | 'grop' | 'avstangt';

export const WARNING_TYPES: { key: WarningType; label: string }[] = [
  { key: 'vagarbete', label: 'Vägarbete' },
  { key: 'halka', label: 'Halka' },
  { key: 'grop', label: 'Dålig väg' },
  { key: 'avstangt', label: 'Avstängt' },
];

const HERE_NOW_RADIUS_M = 100;

function warningLabel(type: string | null): string {
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
  name?: string;
  warningType?: WarningType;
}): Promise<void> {
  const { error } = await supabase.from('spots').insert({
    creator_id: input.creatorId,
    kind: input.kind,
    lat: input.lat,
    lng: input.lng,
    name: input.kind === 'ragg' ? (input.name?.trim() ?? null) : null,
    warning_type: input.kind === 'varning' ? (input.warningType ?? null) : null,
  });
  if (error) throw error;
}

export async function deleteSpot(spotId: string): Promise<void> {
  const { error } = await supabase.from('spots').delete().eq('id', spotId);
  if (error) throw error;
}

export async function fetchSpotPhotoCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('spot_photos').select('spot_id');
  if (error) throw error;
  return (data ?? []).reduce<Record<string, number>>((counts, row) => {
    counts[row.spot_id] = (counts[row.spot_id] ?? 0) + 1;
    return counts;
  }, {});
}

export async function fetchSpotPhotos(spotId: string): Promise<SpotPhoto[]> {
  const { data, error } = await supabase
    .from('spot_photos')
    .select('*')
    .eq('spot_id', spotId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: signed, error: signError } = await supabase.storage
    .from('spot-photos')
    .createSignedUrls(
      rows.map((row) => row.path),
      60 * 60,
    );
  if (signError) throw signError;
  return rows.map((row, index) => ({ ...row, url: signed?.[index]?.signedUrl ?? null }));
}

export async function addSpotPhoto(spotId: string, userId: string, uri: string): Promise<void> {
  const path = await uploadFile('spot-photos', `${spotId}/${userId}-${Date.now()}`, uri);
  const { error } = await supabase
    .from('spot_photos')
    .insert({ spot_id: spotId, author_id: userId, path });
  if (error) {
    await supabase.storage.from('spot-photos').remove([path]);
    throw error;
  }
}

export async function deleteSpotPhoto(photo: Pick<SpotPhotoRow, 'id' | 'path'>): Promise<void> {
  const { error } = await supabase.from('spot_photos').delete().eq('id', photo.id);
  if (error) throw error;
  await supabase.storage.from('spot-photos').remove([photo.path]);
}
