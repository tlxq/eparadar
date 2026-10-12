import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { ActionSheet } from '@/components/action-sheet';
import { EmptyState } from '@/components/empty-state';
import { ScreenBackground } from '@/components/screen-background';
import { Words } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FriendPicker } from '@/features/map/components/friend-picker';
import { MapActionBar, type PickerMode } from '@/features/map/components/map-action-bar';
import { MapBanner } from '@/features/map/components/map-banner';
import { MeSheet } from '@/features/map/components/me-sheet';
import { PlacingControls } from '@/features/map/components/placing-controls';
import { SpotSheet } from '@/features/map/components/spot-sheet';
import { MAP_HTML } from '@/features/map/map-html';
import { SpotComposer } from '@/features/map/spot-composer';
import { type SpotKind } from '@/features/map/spots';
import { StatusSheet } from '@/features/map/status-sheet';
import { fixLocationAccess } from '@/features/map/use-device-position';
import { useHeatHint } from '@/features/map/use-heat-hint';
import { useMapLayers } from '@/features/map/use-map-layers';
import { markInterested } from '@/features/meetups/api';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useUserId } from '@/hooks/use-user-id';
import { type FriendLocation } from '@/lib/api';
import { pressHaptic } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-keys';
import { openPerson } from '@/store/person-sheet';
import { showToast, showUndoToast } from '@/store/toast';
import { setMapStatus } from '@/features/map/status';
import { getErrorMessage } from '@/lib/errors';

type LatLng = { lat: number; lng: number };

export default function MapScreen() {
  const tabBarInset = useTabBarInset();
  const userId = useUserId();
  const webviewRef = useRef<WebView>(null);
  const queryClient = useQueryClient();
  const theme = useTheme();
  const {
    devicePosition,
    locationAccess,
    recheckLocation,
    friendLocations,
    myLocation,
    myProfile,
    spots,
    heat,
    layers,
  } = useMapLayers();
  const heatHint = useHeatHint();

  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const hasCentered = useRef(!!focus);
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
  const [mapReady, setMapReady] = useState(false);

  const postToMap = useCallback((message: object) => {
    webviewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  const centerOnMe = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    let granted = status === 'granted';
    if (!granted) {
      const result = await Location.requestForegroundPermissionsAsync();
      granted = result.status === 'granted';
      recheckLocation();
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
  }, [postToMap, recheckLocation]);

  const fixLocation = async () => {
    const granted = await fixLocationAccess(locationAccess);
    recheckLocation();
    if (granted) centerOnMe();
  };

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

  useEffect(() => {
    if (!focus || !mapReady) return;
    const friend = friendLocations?.find((f) => f.user_id === focus);
    if (!friend) return;
    postToMap({ type: 'CENTER_ON', lat: friend.lat, lng: friend.lng, zoom: 15.5 });
    router.setParams({ focus: undefined });
  }, [focus, mapReady, friendLocations, postToMap]);

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
        setMapReady(true);
        sendAll();
        if (wantFollowRef.current) postToMap({ type: 'FOLLOW_ME' });
      } else if (msg.type === 'FOLLOW_CHANGED') {
        wantFollowRef.current = !!msg.following;
        setFollowing(!!msg.following);
      } else if (msg.type === 'FRIEND_TAP') {
        openPerson(msg.id);
      } else if (msg.type === 'ME_TAP') {
        setMeSheetOpen(true);
      } else if (msg.type === 'SPOT_TAP') {
        setSelectedSpotId(msg.id);
      } else if (msg.type === 'MAP_LONG_PRESS') {
        pressHaptic();
        openComposer({ lat: msg.lat, lng: msg.lng }, 'ragg');
      } else if (msg.type === 'HEAT_IN_VIEW') {
        heatHint.show();
      } else if (msg.type === 'MEETUP_TAP') {
        router.push(`/meetups/${msg.id}`);
      } else if (msg.type === 'DRAFT_PIN_SET' || msg.type === 'DRAFT_PIN_MOVED') {
        setDraftPin({ lat: msg.lat, lng: msg.lng });
        setPlacingStep('confirming');
      } else if (msg.type === 'MEETUP_LONG_PRESS' && userId) {
        pressHaptic();
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
            message="Öppna epaRadar på din telefon för att se kompisar och meets på kartan."
          />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const locationOff =
    locationAccess === 'ask' || locationAccess === 'blocked' || locationAccess === 'off';
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

        {locationOff ? (
          <MapBanner
            icon="location-outline"
            iconColor={theme.accent}
            title={
              locationAccess === 'off' ? 'Platsen är av i telefonen' : 'Appen får inte se din plats'
            }
            message="Slå på den så hittar kartan dig. Kompisar ser dig bara om du delar din plats, och du kan stänga av när du vill."
            actionLabel={
              locationAccess === 'ask' || (locationAccess === 'off' && Platform.OS === 'android')
                ? 'Slå på plats'
                : 'Öppna inställningar'
            }
            onAction={fixLocation}
          />
        ) : heatHint.visible ? (
          <MapBanner
            icon="flame-outline"
            iconColor={theme.accent}
            title="Här brukar folk vara på kvällen"
            message="Det orangea skenet visar var minst två kompisar har varit de senaste timmarna. Det visar aldrig vem."
            actionLabel="Fattar!"
            onAction={heatHint.dismiss}
          />
        ) : null}

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
          title={Words.placeOnMap}
          onClose={() => setAddSheetOpen(false)}
          actions={[
            {
              label: `${Words.ragga} där jag är`,
              icon: 'flag-outline',
              hint: 'Eller håll in var som helst på kartan',
              onPress: () => dropHere('ragg'),
            },
            {
              label: `${Words.warning} där jag är`,
              icon: 'warning-outline',
              onPress: () => dropHere('varning'),
            },
            { label: `${Words.meet} på kartan`, icon: 'calendar-outline', onPress: startPlacing },
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
            ghost={!myLocation?.sharing_enabled}
            onClose={() => setStatusOpen(false)}
            onSaved={(text) => {
              const previous = myLocation?.status_text ?? null;
              setStatusOpen(false);
              queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
              if (text || !previous) {
                showToast({ tone: 'success', message: 'Statusen är ute! Den syns i en timme.' });
                return;
              }
              showUndoToast({
                message: 'Statusen är borttagen.',
                onUndo: async () => {
                  try {
                    await setMapStatus(userId, previous);
                  } catch (error) {
                    showToast({ tone: 'error', message: getErrorMessage(error) });
                  }
                  queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
                },
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
                    ? 'Spotten ligger på kartan!'
                    : 'Varningen är ute i 2 timmar. Tack!',
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
