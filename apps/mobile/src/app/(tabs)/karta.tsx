import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { FlatList, Platform, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/avatar';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { markInterested } from '@/features/meetups/api';
import { useMeetups } from '@/features/meetups/hooks';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { fetchFriendLocations, type FriendLocation } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/hooks/use-theme';

const SWEDEN_CENTER = { lat: 62.0, lng: 15.0, zoom: 4 };
const LONG_PRESS_MS = 500;

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #0B0E14; }
    /* Plain OSM tiles are the only truly-free-forever option (no key, no signup, no
       billing risk) — CARTO's "free" Voyager style turned out to require an account.
       Push the color treatment hard in CSS instead of relying on a paid vector basemap. */
    .leaflet-tile-pane { filter: saturate(2.1) contrast(1.12) brightness(1.05) hue-rotate(-6deg); }
    .map-tint {
      position: absolute; inset: 0; z-index: 450; pointer-events: none;
      background: linear-gradient(155deg, rgba(47,111,237,0.16), rgba(255,138,61,0.10) 60%);
      mix-blend-mode: overlay;
    }
    .leaflet-control-attribution { font-size: 8px !important; }
    .friend-marker {
      width: 48px; height: 48px; border-radius: 50%; background: #2F6FED;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.4);
      position: relative; overflow: visible;
    }
    .friend-marker::after {
      content: ''; position: absolute; inset: -7px; border: 2px solid rgba(47,111,237,0.75);
      border-radius: 50%; animation: friendPulse 2.2s ease-out infinite;
    }
    .friend-marker.is-approximate::before {
      content: ''; position: absolute; inset: -26px; border-radius: 50%;
      background: radial-gradient(circle, rgba(47,111,237,0.68) 0%, rgba(47,111,237,0.12) 55%, rgba(47,111,237,0) 75%);
    }
    .friend-marker.is-approximate::after { display: none; }
    .friend-avatar {
      width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
      display: block; position: relative; z-index: 1;
    }
    .friend-initials {
      color: #fff; font: 800 16px sans-serif; text-transform: uppercase;
      position: relative; z-index: 1;
    }
    .friend-status {
      position: absolute; right: -2px; bottom: -2px; width: 13px; height: 13px;
      background: #22C55E; border: 2px solid #fff; border-radius: 50%; z-index: 2;
    }
    @keyframes friendPulse {
      0% { transform: scale(0.9); opacity: 0.8; }
      100% { transform: scale(1.2); opacity: 0; }
    }
    .meetup-badge {
      width: 42px; height: 42px; border-radius: 50%; background: #FF8A3D;
      display: flex; align-items: center; justify-content: center; font-size: 19px;
      border: 3px solid #fff; box-shadow: 0 3px 10px rgba(0,0,0,0.35); position: relative;
    }
    .meetup-badge.live { animation: meetupPulse 1.8s ease-out infinite; }
    .meetup-count {
      position: absolute; top: -6px; right: -6px; background: #22C55E; color: #06210F;
      font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 7px;
      border: 2px solid #fff; font-family: sans-serif;
    }
    .meetup-here {
      position: absolute; bottom: -6px; right: -6px; background: #22C55E; color: #06210F;
      font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 7px;
      border: 2px solid #fff; font-family: sans-serif; display: flex; align-items: center; gap: 1px;
    }
    @keyframes meetupPulse {
      0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
      100% { box-shadow: 0 0 0 9px rgba(34,197,94,0); }
    }
    .draft-pin {
      width: 44px; height: 44px; border-radius: 50%; background: #2F6FED;
      display: flex; align-items: center; justify-content: center; font-size: 20px;
      border: 3px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="map-tint"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false })
      .setView([${SWEDEN_CENTER.lat}, ${SWEDEN_CENTER.lng}], ${SWEDEN_CENTER.zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap-bidragsgivare',
      maxZoom: 19,
    }).addTo(map);

    // NOTE: never name this "postMessage" — that shadows window.postMessage, which is
    // literally how react-native-webview delivers RN -> WebView messages on Android,
    // and silently breaks every message the app tries to send into this page.
    function sendToNative(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }

    const friendMarkers = {};
    function escapeHtml(value) {
      return String(value || '').replace(/[&<>"']/g, function (char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char];
      });
    }
    function friendInitials(label) {
      return escapeHtml(String(label || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) {
        return part[0];
      }).join('') || '?');
    }
    function friendIcon(friend) {
      const avatar = friend.avatarUrl
        ? '<img class="friend-avatar" src="' + escapeHtml(friend.avatarUrl) + '" />'
        : '<span class="friend-initials">' + friendInitials(friend.label) + '</span>';
      const markerClass = friend.approximate ? 'friend-marker is-approximate' : 'friend-marker';
      return L.divIcon({
        className: '',
        html: '<div class="' + markerClass + '">' + avatar + '<span class="friend-status"></span></div>',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });
    }
    function syncFriends(friends) {
      const ids = friends.map((f) => f.id);
      Object.keys(friendMarkers).forEach((id) => {
        if (!ids.includes(id)) { map.removeLayer(friendMarkers[id]); delete friendMarkers[id]; }
      });
      friends.forEach((f) => {
        if (friendMarkers[f.id]) {
          friendMarkers[f.id].setLatLng([f.lat, f.lng]);
          friendMarkers[f.id].setIcon(friendIcon(f));
        } else {
          friendMarkers[f.id] = L.marker([f.lat, f.lng], { icon: friendIcon(f) }).addTo(map);
        }
        friendMarkers[f.id].bindPopup(f.label);
      });
    }

    const meetupMarkers = {};
    function meetupIcon(m) {
      return L.divIcon({
        className: '',
        html: '<div class="meetup-badge' + (m.hereNowCount > 0 ? ' live' : '') + '" data-meetup-id="' + m.id + '">' + m.emoji +
          (m.interestCount > 0 ? '<span class="meetup-count">' + m.interestCount + '</span>' : '') +
          (m.hereNowCount > 0 ? '<span class="meetup-here">📍' + m.hereNowCount + '</span>' : '') +
          '</div>',
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });
    }
    function syncMeetups(meetups) {
      const ids = meetups.map((m) => m.id);
      Object.keys(meetupMarkers).forEach((id) => {
        if (!ids.includes(id)) { map.removeLayer(meetupMarkers[id]); delete meetupMarkers[id]; }
      });
      meetups.forEach((m) => {
        if (meetupMarkers[m.id]) {
          meetupMarkers[m.id].setLatLng([m.lat, m.lng]);
          meetupMarkers[m.id].setIcon(meetupIcon(m));
        } else {
          const marker = L.marker([m.lat, m.lng], { icon: meetupIcon(m) }).addTo(map);
          marker.on('click', function () {
            // a long-press that just fired also completes as a click on release —
            // swallow that one so it doesn't also navigate to the detail screen.
            if (longPressFired) { longPressFired = false; return; }
            sendToNative({ type: 'MEETUP_TAP', id: m.id });
          });
          meetupMarkers[m.id] = marker;
        }
      });
    }

    // Creating a meetup now goes through the side menu: pick "Skapa träff", tap the map
    // once to drop a draggable pin, drag to fine-tune, then confirm from the native UI.
    let placing = false;
    let draftMarker = null;

    function draftIcon() {
      return L.divIcon({ className: '', html: '<div class="draft-pin">📍</div>', iconSize: [44, 44], iconAnchor: [22, 40] });
    }

    map.on('click', function (e) {
      if (!placing || draftMarker) return;
      draftMarker = L.marker(e.latlng, { icon: draftIcon(), draggable: true }).addTo(map);
      draftMarker.on('dragend', function () {
        const ll = draftMarker.getLatLng();
        sendToNative({ type: 'DRAFT_PIN_MOVED', lat: ll.lat, lng: ll.lng });
      });
      sendToNative({ type: 'DRAFT_PIN_SET', lat: e.latlng.lat, lng: e.latlng.lng });
    });

    function handleMessage(event) {
      const msg = JSON.parse(event.data);
      if (msg.type === 'SET_FRIENDS') syncFriends(msg.friends);
      if (msg.type === 'SET_MEETUPS') syncMeetups(msg.meetups);
      if (msg.type === 'CENTER_ON') {
        map.setView([msg.lat, msg.lng], msg.zoom || 14);
      }
      if (msg.type === 'START_PLACING') {
        placing = true;
      }
      if (msg.type === 'CANCEL_PLACING') {
        placing = false;
        if (draftMarker) { map.removeLayer(draftMarker); draftMarker = null; }
      }
    }
    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    // Holding on an existing pin = quick-mark yourself interested, no navigation.
    let pressTimer = null;
    let pressMeetupId = null;
    let longPressFired = false;

    map.on('mousedown touchstart', function (e) {
      longPressFired = false;
      const targetEl = e.originalEvent && e.originalEvent.target;
      const badge = targetEl && targetEl.closest ? targetEl.closest('[data-meetup-id]') : null;
      pressMeetupId = badge ? badge.getAttribute('data-meetup-id') : null;
      if (!pressMeetupId) return;
      pressTimer = setTimeout(function () {
        longPressFired = true;
        sendToNative({ type: 'MEETUP_LONG_PRESS', id: pressMeetupId });
        pressTimer = null;
      }, ${LONG_PRESS_MS});
    });
    function cancelPress() {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    }
    map.on('mouseup touchend movestart dragstart', cancelPress);
  </script>
</body>
</html>`;

export default function MapScreen() {
  const theme = useTheme();
  const userId = useAuthStore((state) => state.session?.user.id);
  const webviewRef = useRef<WebView>(null);
  const queryClient = useQueryClient();

  const { data: friendLocations } = useQuery({
    queryKey: queryKeys.friendLocations(userId),
    queryFn: () => fetchFriendLocations(userId!),
    enabled: !!userId,
  });
  const { data: meetups } = useMeetups();
  const hasCentered = useRef(false);

  const [picker, setPicker] = useState<'none' | 'search' | 'friends'>('none');
  const [pickerQuery, setPickerQuery] = useState('');
  const [placingStep, setPlacingStep] = useState<'idle' | 'placing' | 'confirming'>('idle');
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const pickerResults = useMemo(() => {
    const friends = friendLocations ?? [];
    if (picker !== 'search' || !pickerQuery.trim()) return friends;
    const needle = pickerQuery.trim().toLowerCase();
    return friends.filter((f) => f.profile.display_name.toLowerCase().includes(needle));
  }, [friendLocations, picker, pickerQuery]);

  const centerOnMe = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const result = await Location.requestForegroundPermissionsAsync();
      granted = result.status === 'granted';
    }
    if (!granted) return;

    const centerOn = (lat: number, lng: number) => {
      webviewRef.current?.postMessage(JSON.stringify({ type: 'CENTER_ON', lat, lng, zoom: 14 }));
    };

    // A fresh GPS fix can take several seconds (longer on a cold chip/indoors), which
    // left the map sitting on the zoomed-out Sweden default the whole time. Center on
    // whatever cached fix the OS already has first — instant if one exists — then
    // silently refine once the precise fix comes in.
    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) centerOn(lastKnown.coords.latitude, lastKnown.coords.longitude);
    } catch {
      // no cached fix available — fall through to the fresh one below
    }

    setLocating(true);
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      centerOn(position.coords.latitude, position.coords.longitude);
    } catch {
      // keep whatever we already centered on (or the Sweden default) if GPS is unavailable
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    if (hasCentered.current) return;
    hasCentered.current = true;
    centerOnMe();
  }, [centerOnMe]);

  useRealtimeTable({
    channelName: `locations:${userId}`,
    table: 'locations',
    enabled: !!userId,
    onChange: () => queryClient.invalidateQueries({ queryKey: queryKeys.friendLocations(userId) }),
  });

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
          avatarUrl: f.profile.avatar_url,
          approximate: f.approximate_enabled,
        })),
      }),
    );
  }, [friendLocations]);

  useEffect(() => {
    if (!meetups) return;
    webviewRef.current?.postMessage(
      JSON.stringify({
        type: 'SET_MEETUPS',
        meetups: meetups.map((m) => ({
          id: m.id,
          lat: m.lat,
          lng: m.lng,
          emoji: m.vibe_emoji,
          interestCount: m.interest_count,
          hereNowCount: m.here_now_count,
        })),
      }),
    );
  }, [meetups]);

  const closePicker = () => {
    setPicker('none');
    setPickerQuery('');
  };

  const centerOnFriend = (friend: FriendLocation) => {
    webviewRef.current?.postMessage(
      JSON.stringify({ type: 'CENTER_ON', lat: friend.lat, lng: friend.lng, zoom: 15 }),
    );
    closePicker();
  };

  const startPlacing = () => {
    closePicker();
    setPlacingStep('placing');
    setDraftPin(null);
    webviewRef.current?.postMessage(JSON.stringify({ type: 'START_PLACING' }));
  };

  const cancelPlacing = () => {
    setPlacingStep('idle');
    setDraftPin(null);
    webviewRef.current?.postMessage(JSON.stringify({ type: 'CANCEL_PLACING' }));
  };

  const confirmPlacement = () => {
    if (!draftPin) return;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'CANCEL_PLACING' }));
    router.push({
      pathname: '/meetups/create',
      params: { lat: String(draftPin.lat), lng: String(draftPin.lng) },
    });
    setPlacingStep('idle');
    setDraftPin(null);
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      console.log('[karta] webview message', msg.type, msg);
      if (msg.type === 'MEETUP_TAP') {
        router.push(`/meetups/${msg.id}`);
      } else if (msg.type === 'DRAFT_PIN_SET' || msg.type === 'DRAFT_PIN_MOVED') {
        setDraftPin({ lat: msg.lat, lng: msg.lng });
        setPlacingStep('confirming');
      } else if (msg.type === 'MEETUP_LONG_PRESS' && userId) {
        Vibration.vibrate(15);
        markInterested(msg.id, userId).then(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.meetups() });
          queryClient.invalidateQueries({ queryKey: queryKeys.meetupDetail(msg.id) });
        });
      }
    } catch {
      // ignore malformed messages from the map webview
    }
  };

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
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: MAP_HTML }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
        />

        {placingStep !== 'idle' && (
          <View style={[styles.hintBanner, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">
              {placingStep === 'placing'
                ? 'Tryck där ni ska träffas 📍'
                : 'Dra pinnen för att justera'}
            </ThemedText>
          </View>
        )}

        {placingStep !== 'idle' && (
          <View style={styles.placingBar}>
            <Pressable
              onPress={cancelPlacing}
              style={[styles.placingBtn, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText type="smallBold" themeColor="textSecondary">
                Avbryt
              </ThemedText>
            </Pressable>
            {placingStep === 'confirming' && (
              <Pressable
                onPress={confirmPlacement}
                style={[
                  styles.placingBtn,
                  styles.placingBtnPrimary,
                  { backgroundColor: theme.brand },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.brandText }}>
                  Placera här ✅
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {placingStep === 'idle' && picker !== 'none' && (
          <Pressable style={StyleSheet.absoluteFill} onPress={closePicker} />
        )}
        {placingStep === 'idle' && picker !== 'none' && (
          <View
            style={[
              styles.pickerPanel,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
          >
            {picker === 'search' && (
              <TextField
                placeholder="Sök vän"
                value={pickerQuery}
                onChangeText={setPickerQuery}
                autoFocus
              />
            )}
            <FlatList
              data={pickerResults}
              keyExtractor={(item) => item.user_id}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => centerOnFriend(item)}
                  style={styles.pickerRow}
                  hitSlop={4}
                >
                  <Avatar
                    name={item.profile.display_name}
                    imageUrl={item.profile.avatar_url}
                    size={32}
                  />
                  <ThemedText type="smallBold">{item.profile.display_name}</ThemedText>
                </Pressable>
              )}
              ListEmptyComponent={
                <ThemedText type="small" themeColor="textSecondary" style={styles.pickerEmpty}>
                  Inga vänner delar sin plats just nu.
                </ThemedText>
              }
            />
          </View>
        )}

        {placingStep === 'idle' && (
          <View
            style={[
              styles.actionBar,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
          >
            <Pressable
              onPress={() => setPicker(picker === 'search' ? 'none' : 'search')}
              style={styles.actionBarBtn}
              hitSlop={8}
              accessibilityLabel="Sök vän"
            >
              <Ionicons
                name="search"
                size={22}
                color={picker === 'search' ? theme.brand : theme.text}
              />
            </Pressable>
            <Pressable
              onPress={() => setPicker(picker === 'friends' ? 'none' : 'friends')}
              style={styles.actionBarBtn}
              hitSlop={8}
              accessibilityLabel="Vänner på kartan"
            >
              <Ionicons
                name="people"
                size={22}
                color={picker === 'friends' ? theme.brand : theme.text}
              />
            </Pressable>
            <Pressable
              onPress={startPlacing}
              style={styles.actionBarBtn}
              hitSlop={8}
              accessibilityLabel="Skapa träff"
            >
              <Ionicons name="add-circle" size={26} color={theme.brand} />
            </Pressable>
            <Pressable
              onPress={centerOnMe}
              disabled={locating}
              style={styles.actionBarBtn}
              hitSlop={8}
              accessibilityLabel="Min position"
            >
              <Ionicons
                name={locating ? 'ellipsis-horizontal' : 'locate'}
                size={22}
                color={theme.text}
              />
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  webview: { flex: 1 },
  actionBar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.five,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  actionBarBtn: { alignItems: 'center', justifyContent: 'center' },
  pickerPanel: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.five + 76,
    maxHeight: 280,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pickerList: { flexGrow: 0 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  pickerEmpty: { paddingVertical: Spacing.two },
  hintBanner: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.four,
    right: Spacing.four,
    borderRadius: 999,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  placingBar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.five,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  placingBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  placingBtnPrimary: { flex: 2 },
});
