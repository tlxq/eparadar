import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Platform, StyleSheet, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { ActionSheet } from '@/components/action-sheet';
import { EmptyState } from '@/components/empty-state';
import { ScreenBackground } from '@/components/screen-background';
import { Spacing } from '@/constants/theme';
import { FriendPicker } from '@/features/map/components/friend-picker';
import { MapActionBar, type PickerMode } from '@/features/map/components/map-action-bar';
import { MeSheet } from '@/features/map/components/me-sheet';
import { PlacingControls } from '@/features/map/components/placing-controls';
import { SpotSheet } from '@/features/map/components/spot-sheet';
import { MAP_HTML } from '@/features/map/map-html';
import { SpotComposer } from '@/features/map/spot-composer';
import { type SpotKind } from '@/features/map/spots';
import { StatusSheet } from '@/features/map/status-sheet';
import { useMapLayers } from '@/features/map/use-map-layers';
import { markInterested } from '@/features/meetups/api';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useUserId } from '@/hooks/use-user-id';
import { type FriendLocation } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';

type LatLng = { lat: number; lng: number };

export default function MapScreen() {
  const tabBarInset = useTabBarInset();
  const userId = useUserId();
  const webviewRef = useRef<WebView>(null);
  const queryClient = useQueryClient();
  const { devicePosition, friendLocations, myLocation, myProfile, spots, heat, layers } =
    useMapLayers();

  const hasCentered = useRef(false);
  const wantFollowRef = useRef(false);
  const [meSheetOpen, setMeSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [composer, setComposer] = useState<{ at: LatLng; kind: SpotKind } | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerMode>('none');
  const [placingStep, setPlacingStep] = useState<'idle' | 'placing' | 'confirming'>('idle');
  const [draftPin, setDraftPin] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [following, setFollowing] = useState(false);

  const postToMap = useCallback((message: object) => {
    webviewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  const centerOnMe = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const result = await Location.requestForegroundPermissionsAsync();
      granted = result.status === 'granted';
    }
    if (!granted) return;

    wantFollowRef.current = true;
    postToMap({ type: 'FOLLOW_ME' });

    const centerOn = (lat: number, lng: number) =>
      postToMap({ type: 'CENTER_ON', lat, lng, zoom: 15.5, pitch: 45, keepFollow: true });

    const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
    if (lastKnown) centerOn(lastKnown.coords.latitude, lastKnown.coords.longitude);

    setLocating(true);
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      centerOn(position.coords.latitude, position.coords.longitude);
    } catch {
      return;
    } finally {
      setLocating(false);
    }
  }, [postToMap]);

  useEffect(() => {
    if (hasCentered.current) return;
    hasCentered.current = true;
    centerOnMe();
  }, [centerOnMe]);

  useEffect(() => {
    postToMap({ type: 'SET_FRIENDS', friends: layers.friends });
  }, [postToMap, layers.friends]);

  useEffect(() => {
    postToMap({ type: 'SET_ME', me: layers.me });
  }, [postToMap, layers.me]);

  useEffect(() => {
    postToMap({ type: 'SET_MEETUPS', meetups: layers.meetups });
  }, [postToMap, layers.meetups]);

  useEffect(() => {
    postToMap({ type: 'SET_SPOTS', spots: layers.spots });
  }, [postToMap, layers.spots]);

  useEffect(() => {
    postToMap({ type: 'SET_HEAT', cells: heat });
  }, [postToMap, heat]);

  const sendAll = () => {
    postToMap({ type: 'SET_FRIENDS', friends: layers.friends });
    postToMap({ type: 'SET_ME', me: layers.me });
    postToMap({ type: 'SET_MEETUPS', meetups: layers.meetups });
    postToMap({ type: 'SET_SPOTS', spots: layers.spots });
    postToMap({ type: 'SET_HEAT', cells: heat });
  };

  const openComposer = (at: LatLng, kind: SpotKind) => {
    postToMap({ type: 'SHOW_DRAFT_SPOT', lat: at.lat, lng: at.lng });
    setComposer({ at, kind });
  };

  const closeComposer = () => {
    postToMap({ type: 'CLEAR_DRAFT_SPOT' });
    setComposer(null);
  };

  const dropHere = (kind: SpotKind) => {
    if (!devicePosition) {
      showToast({
        tone: 'error',
        message: 'Hittar inte din position. Håll in på kartan där spotten ska ligga.',
      });
      return;
    }
    openComposer(devicePosition, kind);
  };

  const centerOnFriend = (friend: FriendLocation) => {
    postToMap({ type: 'CENTER_ON', lat: friend.lat, lng: friend.lng, zoom: 15 });
    setPicker('none');
  };

  const startPlacing = () => {
    setPicker('none');
    setPlacingStep('placing');
    setDraftPin(null);
    postToMap({ type: 'START_PLACING' });
  };

  const cancelPlacing = () => {
    setPlacingStep('idle');
    setDraftPin(null);
    postToMap({ type: 'CANCEL_PLACING' });
  };

  const confirmPlacement = () => {
    if (!draftPin) return;
    postToMap({ type: 'CANCEL_PLACING' });
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
      if (msg.type === 'MAP_READY') {
        sendAll();
        if (wantFollowRef.current) postToMap({ type: 'FOLLOW_ME' });
      } else if (msg.type === 'FOLLOW_CHANGED') {
        wantFollowRef.current = !!msg.following;
        setFollowing(!!msg.following);
      } else if (msg.type === 'ME_TAP') {
        setMeSheetOpen(true);
      } else if (msg.type === 'SPOT_TAP') {
        setSelectedSpotId(msg.id);
      } else if (msg.type === 'MAP_LONG_PRESS') {
        Vibration.vibrate(15);
        openComposer({ lat: msg.lat, lng: msg.lng }, 'ragg');
      } else if (msg.type === 'MEETUP_TAP') {
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
      return;
    }
  };

  if (Platform.OS === 'web') {
    return (
      <ScreenBackground style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <EmptyState
            icon="map-outline"
            title="Kartan finns i appen"
            message="Öppna epaRadar på din telefon för att se vänner och träffar på kartan."
          />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const selectedSpot = spots?.find((spot) => spot.id === selectedSpotId) ?? null;
  const selectedSpotHereNow = layers.spots.find((spot) => spot.id === selectedSpotId)?.hereNow ?? 0;

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

        {placingStep !== 'idle' ? (
          <PlacingControls
            step={placingStep}
            bottom={tabBarInset}
            onCancel={cancelPlacing}
            onConfirm={confirmPlacement}
          />
        ) : (
          <>
            {picker !== 'none' && (
              <FriendPicker
                mode={picker}
                bottom={tabBarInset + 76}
                friends={friendLocations}
                onPick={centerOnFriend}
                onClose={() => setPicker('none')}
              />
            )}
            <MapActionBar
              bottom={tabBarInset}
              picker={picker}
              onPicker={setPicker}
              onAdd={() => setAddSheetOpen(true)}
              onLocate={centerOnMe}
              following={following}
              locating={locating}
            />
          </>
        )}
        <ActionSheet
          visible={addSheetOpen}
          title="Lägg till på kartan"
          onClose={() => setAddSheetOpen(false)}
          actions={[
            {
              label: 'Raggställe där jag är',
              icon: 'flag-outline',
              hint: 'Eller håll in var som helst på kartan',
              onPress: () => dropHere('ragg'),
            },
            {
              label: 'Varning där jag är',
              icon: 'warning-outline',
              onPress: () => dropHere('varning'),
            },
            { label: 'Skapa träff', icon: 'calendar-outline', onPress: startPlacing },
          ]}
        />
        <SpotSheet
          spot={selectedSpot}
          hereNow={selectedSpotHereNow}
          onClose={() => setSelectedSpotId(null)}
        />
        {statusOpen && userId ? (
          <StatusSheet
            userId={userId}
            current={myLocation?.status_text ?? null}
            onClose={() => setStatusOpen(false)}
            onSaved={(text) => {
              setStatusOpen(false);
              queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
              showToast({
                tone: 'success',
                message: text ? 'Statusen syns i en timme.' : 'Statusen är borttagen.',
              });
            }}
          />
        ) : null}
        {composer && userId ? (
          <SpotComposer
            at={composer.at}
            creatorId={userId}
            initialKind={composer.kind}
            onClose={closeComposer}
            onCreated={(kind) => {
              closeComposer();
              queryClient.invalidateQueries({ queryKey: queryKeys.spots() });
              showToast({
                tone: 'success',
                message:
                  kind === 'ragg'
                    ? 'Raggstället ligger på kartan.'
                    : 'Varningen ligger ute i 2 timmar.',
              });
            }}
          />
        ) : null}
        <MeSheet
          visible={meSheetOpen}
          profile={myProfile}
          location={myLocation}
          onClose={() => setMeSheetOpen(false)}
          onStatus={() => setStatusOpen(true)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.three },
  webview: { flex: 1 },
});
