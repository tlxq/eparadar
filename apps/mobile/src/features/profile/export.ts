import { Platform, Share } from 'react-native';

import { supabase } from '@/lib/supabase';

async function exportMyData(): Promise<string> {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw error;
  return JSON.stringify(data, null, 2);
}

export async function shareMyData(): Promise<void> {
  const json = await exportMyData();
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eparadar-mina-uppgifter.json';
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: 'Mina uppgifter från epaRadar', message: json });
}
