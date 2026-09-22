import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const PROMPT_SHOWN_KEY = 'epaRadar/notificationPromptShown';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Standard',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: Colors.dark.brand,
  });
}

function platformName(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

async function registerPushToken(userId: string): Promise<void> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform: platformName() }, { onConflict: 'user_id,token' });
  if (error) throw error;
}

export async function syncPushTokenIfGranted(userId: string): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'granted') return;
  try {
    await registerPushToken(userId);
  } catch (err) {
    console.warn('registerPushToken failed', err);
  }
}

export async function maybeRequestNotificationPermission(userId: string): Promise<void> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted' || !current.canAskAgain) return;

  const alreadyPrompted = await AsyncStorage.getItem(PROMPT_SHOWN_KEY);
  if (alreadyPrompted) return;
  await AsyncStorage.setItem(PROMPT_SHOWN_KEY, '1');

  Alert.alert(
    'Aktivera aviseringar?',
    'Få en avisering när du får ett nytt meddelande, en vänförfrågan eller när någon är intresserad av din träff.',
    [
      { text: 'Inte nu', style: 'cancel' },
      {
        text: 'Aktivera',
        onPress: async () => {
          const result = await Notifications.requestPermissionsAsync();
          if (result.status !== 'granted') return;
          try {
            await registerPushToken(userId);
          } catch (err) {
            console.warn('registerPushToken failed', err);
          }
        },
      },
    ],
  );
}
