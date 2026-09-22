import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

function extensionFromUri(uri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}

export async function uploadImage(bucket: string, pathPrefix: string, uri: string): Promise<string> {
  const ext = extensionFromUri(uri);
  const path = `${pathPrefix}.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const body =
    Platform.OS === 'web'
      ? await (await fetch(uri)).blob()
      : decode(await FileSystem.readAsStringAsync(uri, { encoding: 'base64' }));

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export function uploadAvatar(userId: string, uri: string): Promise<string> {
  return uploadImage('avatars', `${userId}/avatar`, uri);
}

export function uploadCarPhoto(userId: string, uri: string): Promise<string> {
  return uploadImage('car-photos', `${userId}/${Date.now()}`, uri);
}

export function uploadPostImage(userId: string, uri: string): Promise<string> {
  return uploadImage('post-images', `${userId}/${Date.now()}`, uri);
}
