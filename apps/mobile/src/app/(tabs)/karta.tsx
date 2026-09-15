import { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fetchFriendLocations } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

const SWEDEN_CENTER = { lat: 62.0, lng: 15.0, zoom: 4 };

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false })
      .setView([${SWEDEN_CENTER.lat}, ${SWEDEN_CENTER.lng}], ${SWEDEN_CENTER.zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap-bidragsgivare',
      maxZoom: 19,
    }).addTo(map);

    const markers = {};
    function syncFriends(friends) {
      const ids = friends.map((f) => f.id);
      Object.keys(markers).forEach((id) => {
        if (!ids.includes(id)) { map.removeLayer(markers[id]); delete markers[id]; }
      });
      friends.forEach((f) => {
        if (markers[f.id]) { markers[f.id].setLatLng([f.lat, f.lng]); }
        else { markers[f.id] = L.marker([f.lat, f.lng]).addTo(map); }
        markers[f.id].bindPopup(f.label);
      });
    }
    function handleMessage(event) {
      const msg = JSON.parse(event.data);
      if (msg.type === 'SET_FRIENDS') syncFriends(msg.friends);
    }
    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
  </script>
</body>
</html>`;

export default function MapScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const webviewRef = useRef<WebView>(null);
  const queryClient = useQueryClient();

  const { data: friendLocations } = useQuery({
    queryKey: ['friendLocations', userId],
    queryFn: () => fetchFriendLocations(userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`locations:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations' },
        () => queryClient.invalidateQueries({ queryKey: ['friendLocations', userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  useEffect(() => {
    if (!friendLocations) return;
    webviewRef.current?.postMessage(
      JSON.stringify({
        type: 'SET_FRIENDS',
        friends: friendLocations.map((f) => ({
          id: f.user_id,
          lat: f.lat,
          lng: f.lng,
          label: f.profile.display_name,
        })),
      }),
    );
  }, [friendLocations]);

  if (Platform.OS === 'web') {
    return (
      <ScreenBackground style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText themeColor="textSecondary">Kartan kräver appen på en telefon.</ThemedText>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <WebView ref={webviewRef} originWhitelist={['*']} source={{ html: MAP_HTML }} style={styles.webview} />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  webview: { flex: 1 },
});
