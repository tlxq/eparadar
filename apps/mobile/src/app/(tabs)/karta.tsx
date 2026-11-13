import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapColors } from '@eparadar/theme/colors';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useQueryClient } from '@tanstack/react-query';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ActionSheet } from '@/components/action-sheet';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { Words } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MapActionBar } from '@/features/map/components/map-action-bar';
import { MapBanner } from '@/features/map/components/map-banner';
import { FILTER_ROW_HEIGHT, MapFilterChips } from '@/features/map/components/map-filter-chips';
import { WarningNearbyBanner } from '@/features/map/components/warning-nearby-banner';
import { MeSheet } from '@/features/map/components/me-sheet';
import { PlacingControls } from '@/features/map/components/placing-controls';
import { SpotSheet } from '@/features/map/components/spot-sheet';
import { MAP_HTML } from '@/features/map/map-html';
import { SpotComposer } from '@/features/map/spot-composer';
import { type SpotKind } from '@/features/map/spots';
import { StatusSheet } from '@/features/map/status-sheet';
import { fixLocationAccess } from '@/features/map/use-device-position';
import { useHeatHint } from '@/features/map/use-heat-hint';
import { useMapLoadTimeout } from '@/features/map/use-map-load-timeout';
import { useMapFilters, visibleLayers } from '@/features/map/use-map-filters';
import { useMapLayers } from '@/features/map/use-map-layers';
import { useNearbyWarning } from '@/features/map/use-nearby-warning';
import { showSharingFailure, useSharingToggle } from '@/features/map/use-sharing-toggle';
import { updateMeetup } from '@/features/meetups/api';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useUserId } from '@/hooks/use-user-id';
import { pressHaptic } from '@/lib/haptics';
import { queryKeys } from '@/lib/query-keys';
import { openPerson } from '@/store/person-sheet';
import { showToast, showUndoToast } from '@/store/toast';
import { setMapStatus } from '@/features/map/status';
import { getErrorMessage } from '@/lib/errors';

type LatLng = { lat: number; lng: number };

const TOP_GAP = Spacing.two;

export default function MapScreen() {
  const focused = useIsFocused();
  const tabBarInset = useTabBarInset();
  const userId = useUserId();
  const webviewRef = useRef<WebView>(null);
  const queryClient = useQueryClient();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const chipsTop = insets.top + TOP_GAP;
  const belowChips = chipsTop + FILTER_ROW_HEIGHT + Spacing.two;
  const {
    devicePosition,
    deviceMotion,
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
  const hiddenLayers = useMapFilters((state) => state.hidden);
  const toggleLayer = useMapFilters((state) => state.toggle);
  const shown = useMemo(() => visibleLayers(layers, hiddenLayers), [layers, hiddenLayers]);
  const { setSharing, busy: ghostBusy } = useSharingToggle();
  const ghost = !myLocation?.sharing_enabled;
  const nearbyWarning = useNearbyWarning({
    position: devicePosition,
    heading: deviceMotion.heading,
    moving: deviceMotion.moving,
    spots: layers.spots,
    enabled: !hiddenLayers.includes('warnings'),
  });

  const { focus, focusLat, focusLng, meetup, move } = useLocalSearchParams<{
    focus?: string;
    focusLat?: string;
    focusLng?: string;
    meetup?: string;
    move?: string;
  }>();
  const hasCentered = useRef(!!focus || !!focusLat);
  const wantFollowRef = useRef(false);
  const overviewRef = useRef<{ lat?: number; lng?: number } | null>({});
  const [meSheetOpen, setMeSheetOpen] = useState(false);
  const [holdPoint, setHoldPoint] = useState<LatLng | null>(null);
  const [movingMeetupId, setMovingMeetupId] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [composer, setComposer] = useState<{ at: LatLng; kind: SpotKind } | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [placingStep, setPlacingStep] = useState<'idle' | 'placing' | 'confirming'>('idle');
  const [draftPin, setDraftPin] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [following, setFollowing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const mapTimedOut = useMapLoadTimeout(mapReady, loadAttempt);

  const postToMap = useCallback((message: object) => {
    webviewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  const centerOnMe = useCallback(
    async (overview = false) => {
      const { status } = await Location.getForegroundPermissionsAsync();
      let granted = status === 'granted';
      if (!granted) {
        const result = await Location.requestForegroundPermissionsAsync();
        granted = result.status === 'granted';
        recheckLocation();
      }
      if (!granted) return;

      wantFollowRef.current = !overview;
      if (!overview) postToMap({ type: 'FOLLOW_ME' });

      if (!overview) overviewRef.current = null;
      const centerOn = (lat: number, lng: number) => {
        if (overview) {
          overviewRef.current = { lat, lng };
          postToMap({ type: 'OVERVIEW', lat, lng });
        } else {
          postToMap({ type: 'CENTER_ON', lat, lng, zoom: 15.5, pitch: 45, keepFollow: true });
        }
      };

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
    },
    [postToMap, recheckLocation],
  );

  const fixLocation = async () => {
    const granted = await fixLocationAccess(locationAccess);
    recheckLocation();
    if (granted) centerOnMe();
  };

  useEffect(() => {
    if (hasCentered.current) return;
    hasCentered.current = true;
    centerOnMe(true);
  }, [centerOnMe]);

  useEffect(() => {
    postToMap({ type: 'SET_FRIENDS', friends: shown.friends });
  }, [postToMap, shown.friends]);

  useEffect(() => {
    postToMap({ type: 'SET_ME', me: layers.me });
  }, [postToMap, layers.me]);

  useEffect(() => {
    postToMap({ type: 'SET_MEETUPS', meetups: shown.meetups });
  }, [postToMap, shown.meetups]);

  useEffect(() => {
    postToMap({ type: 'SET_SPOTS', spots: shown.spots });
  }, [postToMap, shown.spots]);

  useEffect(() => {
    postToMap({ type: 'SET_HEAT', cells: heat });
  }, [postToMap, heat]);

  useEffect(() => {
    postToMap({ type: 'SET_POSTS', posts: layers.posts });
  }, [postToMap, layers.posts]);

  useEffect(() => {
    if (!mapReady) return;
    postToMap({ type: 'SET_INSETS', top: belowChips, bottom: tabBarInset });
  }, [mapReady, postToMap, belowChips, tabBarInset]);

  useEffect(() => {
    if (!focusLat || !focusLng || !mapReady) return;
    const lat = Number(focusLat);
    const lng = Number(focusLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      postToMap({ type: 'CENTER_ON', lat, lng, zoom: 16 });
    }
    router.setParams({ focusLat: undefined, focusLng: undefined });
  }, [focusLat, focusLng, mapReady, postToMap]);

  useEffect(() => {
    if (!focus || !mapReady) return;
    const friend = friendLocations?.find((f) => f.user_id === focus);
    if (!friend) return;
    if (hiddenLayers.includes('friends')) toggleLayer('friends');
    postToMap({ type: 'CENTER_ON', lat: friend.lat, lng: friend.lng, zoom: 15.5 });
    router.setParams({ focus: undefined });
  }, [focus, mapReady, friendLocations, postToMap, hiddenLayers, toggleLayer]);

  useEffect(() => {
    if (!meetup || !mapReady) return;
    const target = layers.meetups.find((m) => m.id === meetup);
    if (!target) return;
    hasCentered.current = true;
    if (hiddenLayers.includes('meets')) toggleLayer('meets');
    postToMap({ type: 'CENTER_ON', lat: target.lat, lng: target.lng, zoom: 16 });
    router.setParams({ meetup: undefined });
  }, [meetup, mapReady, layers.meetups, postToMap, hiddenLayers, toggleLayer]);

  const beginMove = useCallback(
    (meetupId: string, at: LatLng) => {
      setMovingMeetupId(meetupId);
      setPlacingStep('placing');
      setDraftPin(null);
      postToMap({ type: 'START_PLACING', lat: at.lat, lng: at.lng });
    },
    [postToMap],
  );

  useEffect(() => {
    if (!move || !mapReady) return;
    const target = layers.meetups.find((m) => m.id === move);
    if (!target) return;
    hasCentered.current = true;
    const frame = requestAnimationFrame(() => {
      beginMove(move, target);
      router.setParams({ move: undefined });
    });
    return () => cancelAnimationFrame(frame);
  }, [move, mapReady, layers.meetups, beginMove]);

  const sendAll = () => {
    postToMap({ type: 'SET_FRIENDS', friends: shown.friends });
    postToMap({ type: 'SET_ME', me: layers.me });
    postToMap({ type: 'SET_MEETUPS', meetups: shown.meetups });
    postToMap({ type: 'SET_SPOTS', spots: shown.spots });
    postToMap({ type: 'SET_HEAT', cells: heat });
    postToMap({ type: 'SET_POSTS', posts: layers.posts });
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

  const closeHoldSheet = () => {
    setHoldPoint(null);
    postToMap({ type: 'CLEAR_DRAFT_SPOT' });
  };

  const addAtHoldPoint = (kind: SpotKind | 'meet') => {
    const at = holdPoint;
    setHoldPoint(null);
    if (!at) return;
    if (kind === 'meet') {
      postToMap({ type: 'CLEAR_DRAFT_SPOT' });
      router.push({
        pathname: '/meetups/create',
        params: { lat: String(at.lat), lng: String(at.lng) },
      });
      return;
    }
    openComposer(at, kind);
  };

  const toggleGhost = async () => {
    const failure = await setSharing(ghost);
    if (failure) {
      showSharingFailure(failure);
      return;
    }
    showToast({
      tone: 'success',
      message: ghost ? 'Du syns igen för dina kompisar!' : 'Spökläge på! Ingen ser dig nu.',
    });
  };

  const startPlacing = () => {
    setPlacingStep('placing');
    setDraftPin(null);
    postToMap({ type: 'START_PLACING' });
  };

  const cancelPlacing = () => {
    const moved = movingMeetupId;
    setPlacingStep('idle');
    setDraftPin(null);
    setMovingMeetupId(null);
    postToMap({ type: 'CANCEL_PLACING' });
    if (moved) router.push(`/meetups/${moved}`);
  };

  const moveMeetupTo = async (meetupId: string, at: LatLng) => {
    try {
      await updateMeetup(meetupId, { lat: at.lat, lng: at.lng });
      queryClient.invalidateQueries({ queryKey: queryKeys.meetups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.meetupDetail(meetupId) });
      showToast({ tone: 'success', message: 'Träffen är flyttad!' });
      router.push(`/meetups/${meetupId}`);
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  };

  const confirmPlacement = () => {
    if (!draftPin) return;
    postToMap({ type: 'CANCEL_PLACING' });
    if (movingMeetupId) {
      const id = movingMeetupId;
      setMovingMeetupId(null);
      setPlacingStep('idle');
      setDraftPin(null);
      moveMeetupTo(id, draftPin);
      return;
    }
    router.push({
      pathname: '/meetups/create',
      params: { lat: String(draftPin.lat), lng: String(draftPin.lng) },
    });
    setPlacingStep('idle');
    setDraftPin(null);
  };

  const reloadMap = () => {
    setMapReady(false);
    setLoadAttempt((n) => n + 1);
    webviewRef.current?.reload();
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MAP_READY') {
        setMapReady(true);
        sendAll();
        if (wantFollowRef.current) postToMap({ type: 'FOLLOW_ME' });
        postToMap({ type: 'SET_INSETS', top: belowChips, bottom: tabBarInset });
        if (overviewRef.current) postToMap({ type: 'OVERVIEW', ...overviewRef.current });
      } else if (msg.type === 'FOLLOW_CHANGED') {
        wantFollowRef.current = !!msg.following;
        setFollowing(!!msg.following);
      } else if (msg.type === 'FRIEND_TAP') {
        openPerson(msg.id, { fromMap: true });
      } else if (msg.type === 'ME_TAP') {
        setMeSheetOpen(true);
      } else if (msg.type === 'POST_TAP') {
        router.push(`/post/${msg.id}`);
      } else if (msg.type === 'SPOT_TAP') {
        setSelectedSpotId(msg.id);
      } else if (msg.type === 'MAP_LONG_PRESS') {
        pressHaptic();
        postToMap({ type: 'SHOW_DRAFT_SPOT', lat: msg.lat, lng: msg.lng });
        setHoldPoint({ lat: msg.lat, lng: msg.lng });
      } else if (msg.type === 'HEAT_IN_VIEW') {
        heatHint.show();
      } else if (msg.type === 'MEETUP_TAP') {
        router.push(`/meetups/${msg.id}`);
      } else if (msg.type === 'DRAFT_PIN_SET' || msg.type === 'DRAFT_PIN_MOVED') {
        setDraftPin({ lat: msg.lat, lng: msg.lng });
        setPlacingStep('confirming');
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
            message="Öppna epaRadar på din telefon för att se kompisar och träffar på kartan."
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
      {focused ? <StatusBar style="light" /> : null}
      <View style={styles.safeArea}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: MAP_HTML }}
          style={styles.webview}
          onMessage={handleWebViewMessage}
        />

        <LinearGradient
          pointerEvents="none"
          colors={[MapColors.scrimTop, MapColors.scrimClear]}
          style={[styles.topScrim, { height: belowChips }]}
        />

        {mapReady ? null : (
          <View
            pointerEvents={mapTimedOut ? 'auto' : 'none'}
            style={[styles.mapLoading, { backgroundColor: theme.background }]}
          >
            {mapTimedOut ? (
              <ErrorState
                title={Words.mapFailed}
                message={Words.mapFailedHint}
                onRetry={reloadMap}
              />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {Words.mapLoading}
              </ThemedText>
            )}
          </View>
        )}

        {placingStep === 'idle' ? <MapFilterChips top={chipsTop} /> : null}

        {locationOff ? (
          <MapBanner
            top={belowChips}
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
        ) : nearbyWarning.warning && placingStep === 'idle' ? (
          <WarningNearbyBanner
            warning={nearbyWarning.warning}
            top={belowChips}
            onClose={nearbyWarning.dismiss}
          />
        ) : heatHint.visible ? (
          <MapBanner
            top={belowChips}
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
            moving={!!movingMeetupId}
            onCancel={cancelPlacing}
            onConfirm={confirmPlacement}
          />
        ) : (
          <MapActionBar
            bottom={tabBarInset}
            ghost={ghost}
            ghostBusy={ghostBusy}
            onToggleGhost={toggleGhost}
            onAddRagga={() => dropHere('ragg')}
            onAddWarning={() => dropHere('varning')}
            onAddMeet={startPlacing}
            onLocate={() => centerOnMe()}
            following={following}
            locating={locating}
          />
        )}
        <ActionSheet
          visible={!!holdPoint}
          title="Lägg till här"
          onClose={closeHoldSheet}
          actions={[
            {
              label: Words.ragga,
              icon: 'sparkles-outline',
              hint: 'Ett ställe där folk brukar hänga',
              onPress: () => addAtHoldPoint('ragg'),
            },
            {
              label: Words.warning,
              icon: 'warning-outline',
              hint: 'Vägarbete, halka, gropar',
              onPress: () => addAtHoldPoint('varning'),
            },
            {
              label: Words.meet,
              icon: 'calendar-outline',
              hint: 'Bjud in kompisarna hit',
              onPress: () => addAtHoldPoint('meet'),
            },
          ]}
        />
        <SpotSheet
          spot={selectedSpot}
          hereNow={selectedSpotHereNow}
          myPosition={devicePosition}
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
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  webview: { flex: 1 },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  mapLoading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
