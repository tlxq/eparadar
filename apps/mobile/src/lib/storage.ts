import { supabase } from '@/lib/supabase';

export const SIGNED_URL_TTL_S = 60 * 60;

export async function signedUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_S);
  if (error) throw error;
  return data.signedUrl;
}

export async function signedUrls(bucket: string, paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, SIGNED_URL_TTL_S);
  if (error) throw error;
  const byPath = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) byPath.set(item.path, item.signedUrl);
  }
  return byPath;
}

export function storagePathFromPublicUrl(bucket: string, url: string | null): string | null {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
}
