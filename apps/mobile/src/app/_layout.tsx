import { useEffect } from 'react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import * as Sentry from '@sentry/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import '@/lib/location-task';

import { ErrorFallback } from '@/components/error-fallback';
import { ToastHost } from '@/components/toast-host';
import { ReportSheetHost } from '@/features/moderation/report-sheet';
import { PersonSheetHost } from '@/features/people/person-sheet';
import { Colors, Typography } from '@/constants/theme';
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

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({ dsn: sentryDsn });
}

function RootLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
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
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: palette.gradientTop },
            headerShadowVisible: false,
            headerTintColor: palette.brandOnSurface,
            headerTitleStyle: {
              fontFamily: Typography.headline.fontFamily,
              fontSize: Typography.headline.fontSize,
              color: palette.text,
            },
            headerBackButtonDisplayMode: 'minimal',
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
            <Stack.Screen
              name="post/new"
              options={{ presentation: 'modal', headerShown: true, title: 'Ny post' }}
            />
            <Stack.Screen
              name="cars/new"
              options={{ presentation: 'modal', headerShown: true, title: 'Lägg till bil' }}
            />
            <Stack.Screen
              name="chat/new"
              options={{ presentation: 'modal', headerShown: true, title: 'Ny chatt' }}
            />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            <Stack.Screen
              name="friends/add"
              options={{ presentation: 'modal', headerShown: true, title: 'Lägg till vän' }}
            />
            <Stack.Screen name="friends/code" options={{ presentation: 'modal' }} />
            <Stack.Screen name="friends/nearby" options={{ presentation: 'modal' }} />
            <Stack.Screen name="friends/scan" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen
              name="friends/enter-code"
              options={{ presentation: 'modal', headerShown: true, title: 'Skriv in kod' }}
            />
            <Stack.Screen name="add/[code]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="group/[id]" />
            <Stack.Screen name="settings" options={{ headerShown: true, title: 'Inställningar' }} />
            <Stack.Screen
              name="delete-account"
              options={{ headerShown: true, title: 'Radera konto' }}
            />
            <Stack.Screen
              name="meetups/create"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="meetups/[id]"
              options={{ presentation: 'modal', headerShown: false }}
            />
          </Stack.Protected>
          <Stack.Screen
            name="privacy"
            options={{ headerShown: true, title: 'Integritetspolicy' }}
          />
          <Stack.Screen name="terms" options={{ headerShown: true, title: 'Användarvillkor' }} />
          <Stack.Screen
            name="community"
            options={{ headerShown: true, title: 'Communityregler' }}
          />
        </Stack>
        {session ? <PersonSheetHost /> : null}
        {session ? <ReportSheetHost /> : null}
        <ToastHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export { ErrorFallback as ErrorBoundary };

export default Sentry.wrap(RootLayout);
