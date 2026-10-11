import * as ImagePicker from 'expo-image-picker';

import { showToast } from '@/store/toast';

type PickImageOptions = {
  aspect?: [number, number];
  quality?: number;
};

export async function pickImage({ aspect, quality = 0.8 }: PickImageOptions = {}) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    showToast({ tone: 'error', message: 'epaRadar behöver tillgång till dina bilder.' });
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: !!aspect,
    aspect,
    quality,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
