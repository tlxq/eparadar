import { useEffect } from 'react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const session = useAuthStore((state) => state.session);
  const initializing = useAuthStore((state) => state.initializing);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      useAuthStore.getState().setSession(data.session);
      useAuthStore.getState().setInitializing(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      useAuthStore.getState().setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" />
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
            <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
            <Stack.Screen
              name="friends/add"
              options={{ presentation: 'modal', headerShown: true, title: 'Lägg till vän' }}
            />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
