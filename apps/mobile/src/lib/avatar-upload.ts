import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

function extensionFromUri(uri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(uri);
  return match ? match[1].toLowerCase() : 'jpg';
}

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const ext = extensionFromUri(uri);
  const path = `${userId}/avatar.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  // expo-file-system's base64 read is native-only; on web the picked URI is a blob: URL
  // that only plain fetch()/blob() can read.
  const body =
    Platform.OS === 'web'
      ? await (await fetch(uri)).blob()
      : decode(await FileSystem.readAsStringAsync(uri, { encoding: 'base64' }));

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, body, { contentType, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust so the new image shows immediately even though the path/filename is stable.
  return `${data.publicUrl}?t=${Date.now()}`;
}
