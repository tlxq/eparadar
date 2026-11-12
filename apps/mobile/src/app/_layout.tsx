import { useEffect } from 'react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import '@/lib/location-task';

import { ConfirmSheetHost } from '@/components/confirm-sheet';
import { ErrorFallback } from '@/components/error-fallback';
import { ToastHost } from '@/components/toast-host';
import { useAuthLinks } from '@/features/auth/use-auth-links';
import { ReportSheetHost } from '@/features/moderation/report-sheet';
import { PersonSheetHost } from '@/features/people/person-sheet';
import { ShareSheetHost } from '@/features/feed/components/share-sheet';
import { trackEvent } from '@/lib/analytics';
import { queryClient } from '@/lib/queryClient';
import {
  setNotificationNavigationReady,
  setupNotificationResponseListener,
  syncPushTokenIfGranted,
} from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const colorScheme = useColorScheme();
  const session = useAuthStore((state) => state.session);
  const initializing = useAuthStore((state) => state.initializing);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      useAuthStore.getState().setSession(data.session);
      useAuthStore.getState().setInitializing(false);
      trackEvent('app_opened');
      if (data.session) syncPushTokenIfGranted(data.session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      useAuthStore.getState().setSession(newSession);
      if (newSession) syncPushTokenIfGranted(newSession.user.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => setupNotificationResponseListener(), []);

  useAuthLinks();

  const ready = !initializing && fontsLoaded && !!session;
  useEffect(() => {
    setNotificationNavigationReady(ready);
  }, [ready]);

  useEffect(() => {
    if (!initializing && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [initializing, fontsLoaded]);

  if (initializing || !fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="age" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen
              name="onboarding"
              options={{ gestureEnabled: false, animation: 'fade' }}
            />
            <Stack.Screen name="post/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="cars/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="cars/[id]/index" />
            <Stack.Screen name="cars/[id]/edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="person/[id]" />
            <Stack.Screen name="chat/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="chat/[id]" />
            <Stack.Screen name="friends/add" options={{ presentation: 'modal' }} />
            <Stack.Screen name="friends/code" options={{ presentation: 'modal' }} />
            <Stack.Screen name="friends/nearby" options={{ presentation: 'modal' }} />
            <Stack.Screen name="friends/scan" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="friends/enter-code" options={{ presentation: 'modal' }} />
            <Stack.Screen name="add/[code]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="group/[id]" />
            <Stack.Screen name="post/[id]" />
            <Stack.Screen name="group/add-members" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="delete-account" />
            <Stack.Screen name="meetups/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="meetups/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="meetups/edit" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Screen
            name="reset-password"
            options={{ gestureEnabled: false, animation: 'fade' }}
          />
          <Stack.Screen name="privacy" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="community" />
        </Stack>
        {session ? <PersonSheetHost /> : null}
        {session ? <ReportSheetHost /> : null}
        {session ? <ShareSheetHost /> : null}
        <ConfirmSheetHost />
        <ToastHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export { ErrorFallback as ErrorBoundary };

export default RootLayout;
