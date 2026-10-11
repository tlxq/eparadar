import * as ImagePicker from 'expo-image-picker';

import { showToast } from '@/store/toast';

export type ImageSource = 'library' | 'camera';

type PickImageOptions = {
  aspect?: [number, number];
  quality?: number;
  source?: ImageSource;
};

export async function pickImage({
  aspect,
  quality = 0.8,
  source = 'library',
}: PickImageOptions = {}) {
  const camera = source === 'camera';
  const { status } = camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    showToast({
      tone: 'error',
      message: camera
        ? 'epaRadar behöver tillgång till kameran.'
        : 'epaRadar behöver tillgång till dina bilder.',
    });
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: !!aspect,
    aspect,
    quality,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
