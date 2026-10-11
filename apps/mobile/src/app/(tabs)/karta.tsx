import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { FlatList, Platform, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Avatar } from '@/components/avatar';
import { ScreenBackground } from '@/components/screen-background';
import { TextField } from '@/components/text-field';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { carColorHex } from '@/features/map/car-colors';
import { MAP_HTML } from '@/features/map/map-html';
import { meetupVibe, SPOT_ICONS, spotIconKey } from '@/features/map/map-icons';
import { SpotComposer } from '@/features/map/spot-composer';
import { SpotPhotoStrip } from '@/features/map/spot-photo-strip';
import { fetchEveningHeat } from '@/features/map/status';
import { StatusSheet } from '@/features/map/status-sheet';
import {
  addSpotPhoto,
  countHereNow,
  deleteSpot,
  fetchSpotPhotoCounts,
  fetchSpots,
  spotTitle,
  type SpotKind,
} from '@/features/map/spots';
import { motionFromCoords } from '@/features/map/motion';
import { markInterested } from '@/features/meetups/api';
import { useMeetups } from '@/features/meetups/hooks';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { type Car, type FriendLocation } from '@/lib/api';
import { confirmDestructive } from '@/lib/confirm';
import { getErrorMessage } from '@/lib/errors';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/store/toast';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { useMyCars, useProfile } from '@/features/profile/hooks';
import { useFriendLocations, useMyLocation } from '@/features/map/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { pickImage } from '@/lib/pick-image';

export default function MapScreen() {
  const theme = useTheme();
  const tabBarInset = useTabBarInset();
  const userId = useUserId();
  const webviewRef = useRef<WebView>(null);
  const queryClient = useQueryClient();

  const { data: friendLocations } = useFriendLocations();
  const { data: meetups } = useMeetups();
  const { data: myLocation } = useMyLocation();
  const { data: myProfile } = useProfile();
  const { data: myCars } = useMyCars();
  const hasCentered = useRef(false);
  const [devicePosition, setDevicePosition] = useState<{ lat: number; lng: number } | null>(null);
  const [deviceMotion, setDeviceMotion] = useState<{ moving: boolean; heading: number | null }>({
    moving: false,
    heading: null,
  });
  const [meSheetOpen, setMeSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [composer, setComposer] = useState<{
    at: { lat: number; lng: number };
    kind: SpotKind;
  } | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const { data: heatCells } = useQuery({
    queryKey: queryKeys.eveningHeat(userId),
    queryFn: fetchEveningHeat,
    enabled: !!userId,
    refetchInterval: 120000,
  });
  const { data: spots } = useQuery({
    queryKey: queryKeys.spots(),
    queryFn: fetchSpots,
    enabled: !!userId,
    refetchInterval: 60000,
  });

  const { data: photoCounts } = useQuery({
    queryKey: queryKeys.spotPhotoCounts(),
    queryFn: fetchSpotPhotoCounts,
    enabled: !!userId,
    refetchInterval: 120000,
  });

  useRealtimeTable({
    channelName: `spot_photos:${userId}`,
    table: 'spot_photos',
    enabled: !!userId,
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotoCounts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.allSpotPhotos() });
    },
  });

  useRealtimeTable({
    channelName: `spots:${userId}`,
    table: 'spots',
    enabled: !!userId,
    onChange: () => queryClient.invalidateQueries({ queryKey: queryKeys.spots() }),
  });

  useFocusEffect(
    useCallback(() => {
      let subscription: Location.LocationSubscription | null = null;
      let cancelled = false;
      Location.getForegroundPermissionsAsync()
        .then(({ status }) => {
          if (status !== 'granted' || cancelled) return null;
          return Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 1000 },
            (position) => {
              setDevicePosition({ lat: position.coords.latitude, lng: position.coords.longitude });
              setDeviceMotion(motionFromCoords(position.coords));
            },
          );
        })
        .then((sub) => {
          if (!sub) return;
          if (cancelled) sub.remove();
          else subscription = sub;
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
        subscription?.remove();
      };
    }, []),
  );

  const [picker, setPicker] = useState<'none' | 'search' | 'friends'>('none');
  const [pickerQuery, setPickerQuery] = useState('');
  const [placingStep, setPlacingStep] = useState<'idle' | 'placing' | 'confirming'>('idle');
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [following, setFollowing] = useState(false);
  const wantFollowRef = useRef(false);

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

    wantFollowRef.current = true;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'FOLLOW_ME' }));

    const centerOn = (lat: number, lng: number) => {
      webviewRef.current?.postMessage(
        JSON.stringify({ type: 'CENTER_ON', lat, lng, zoom: 15.5, pitch: 45, keepFollow: true }),
      );
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
    onChange: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.friendLocations(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myLocation(userId) });
    },
  });

  const postToMap = useCallback((message: object) => {
    webviewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  const friendsPayload = useMemo(
    () =>
      (friendLocations ?? []).map((f) => ({
        id: f.user_id,
        lat: f.lat,
        lng: f.lng,
        label: f.profile.display_name,
        avatarUrl: f.profile.avatar_url,
        approximate: f.approximate_enabled,
        ring: carColorHex(latestCarColor(f.profile.cars)),
        heading: f.heading,
        moving: f.moving,
        updatedAt: new Date(f.updated_at).getTime(),
        status: f.status_text,
        statusExpiresAt: f.status_expires_at ? new Date(f.status_expires_at).getTime() : null,
      })),
    [friendLocations],
  );

  const mePayload = useMemo(() => {
    const position =
      devicePosition ?? (myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : null);
    if (!position || !myProfile) return null;
    const ghost = !myLocation?.sharing_enabled;
    return {
      lat: position.lat,
      lng: position.lng,
      label: myProfile.display_name,
      avatarUrl: myProfile.avatar_url,
      ring: carColorHex(latestCarColor(myCars)),
      ghost,
      approximate: !ghost && !!myLocation?.approximate_enabled,
      moving: deviceMotion.moving,
      heading: deviceMotion.heading,
      status: ghost ? null : (myLocation?.status_text ?? null),
      statusExpiresAt: myLocation?.status_expires_at
        ? new Date(myLocation.status_expires_at).getTime()
        : null,
    };
  }, [devicePosition, deviceMotion, myLocation, myProfile, myCars]);

  const meetupsPayload = useMemo(
    () =>
      (meetups ?? []).map((m) => ({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        icon: meetupVibe(m.vibe).icon,
        interestCount: m.interest_count,
        hereNowCount: m.here_now_count,
      })),
    [meetups],
  );

  const spotsPayload = useMemo(() => {
    const people = friendsPayload.filter((f) => !f.approximate);
    const present =
      mePayload && !mePayload.ghost
        ? [...people, { lat: mePayload.lat, lng: mePayload.lng }]
        : people;
    return (spots ?? []).map((spot) => ({
      id: spot.id,
      kind: spot.kind,
      lat: spot.lat,
      lng: spot.lng,
      title: spotTitle(spot),
      icon: SPOT_ICONS[spotIconKey(spot)],
      hereNow: spot.kind === 'ragg' ? countHereNow(spot, present) : 0,
      photoCount: photoCounts?.[spot.id] ?? 0,
      expiresAt: spot.expires_at ? new Date(spot.expires_at).getTime() : null,
    }));
  }, [spots, friendsPayload, mePayload, photoCounts]);

  const sendAll = useCallback(() => {
    postToMap({ type: 'SET_FRIENDS', friends: friendsPayload });
    postToMap({ type: 'SET_ME', me: mePayload });
    postToMap({ type: 'SET_MEETUPS', meetups: meetupsPayload });
    postToMap({ type: 'SET_SPOTS', spots: spotsPayload });
    postToMap({ type: 'SET_HEAT', cells: heatCells ?? [] });
  }, [postToMap, friendsPayload, mePayload, meetupsPayload, spotsPayload, heatCells]);

  useEffect(() => {
    postToMap({ type: 'SET_HEAT', cells: heatCells ?? [] });
  }, [postToMap, heatCells]);

  useEffect(() => {
    postToMap({ type: 'SET_SPOTS', spots: spotsPayload });
  }, [postToMap, spotsPayload]);

  const openComposer = useCallback(
    (at: { lat: number; lng: number }, kind: SpotKind) => {
      postToMap({ type: 'SHOW_DRAFT_SPOT', lat: at.lat, lng: at.lng });
      setComposer({ at, kind });
    },
    [postToMap],
  );

  const closeComposer = useCallback(() => {
    postToMap({ type: 'CLEAR_DRAFT_SPOT' });
    setComposer(null);
  }, [postToMap]);

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

  const selectedSpot = spots?.find((spot) => spot.id === selectedSpotId) ?? null;
  const selectedSpotHereNow = spotsPayload.find((spot) => spot.id === selectedSpotId)?.hereNow ?? 0;

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handleAddSpotPhoto(spotId: string) {
    if (!userId) return;
    const uri = await pickImage({ aspect: [4, 3], quality: 0.7 });
    if (!uri) return;
    setUploadingPhoto(true);
    try {
      await addSpotPhoto(spotId, userId, uri);
      queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotos(spotId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.spotPhotoCounts() });
      showToast({ tone: 'success', message: 'Bilden ligger på spotten i 24 timmar.' });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleDeleteSpot(spotId: string) {
    const ok = await confirmDestructive({
      title: 'Ta bort spotten?',
      message: 'Den försvinner från kartan för alla.',
      confirmLabel: 'Ta bort',
    });
    if (!ok) return;
    try {
      await deleteSpot(spotId);
      queryClient.invalidateQueries({ queryKey: queryKeys.spots() });
      showToast({ message: 'Spotten är borttagen.' });
    } catch (error) {
      showToast({ tone: 'error', message: getErrorMessage(error) });
    }
  }

  useEffect(() => {
    postToMap({ type: 'SET_FRIENDS', friends: friendsPayload });
  }, [postToMap, friendsPayload]);

  useEffect(() => {
    postToMap({ type: 'SET_ME', me: mePayload });
  }, [postToMap, mePayload]);

  useEffect(() => {
    postToMap({ type: 'SET_MEETUPS', meetups: meetupsPayload });
  }, [postToMap, meetupsPayload]);

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

  const meActions: SheetAction[] = [
    {
      label: myLocation?.status_text ? 'Ändra status' : 'Sätt status',
      icon: 'chatbubble-ellipses-outline',
      hint: 'Syns för vänner i en timme',
      onPress: () => setStatusOpen(true),
    },
    {
      label: 'Ändra vad jag delar',
      icon: 'options-outline',
      onPress: () => router.push('/settings'),
    },
    {
      label: 'Min profil',
      icon: 'person-circle-outline',
      onPress: () => router.push('/(tabs)/profile'),
    },
  ];
  const meSharingText = !myLocation?.sharing_enabled
    ? 'Spökläge är på. Ingen av dina vänner ser dig på kartan.'
    : myLocation.approximate_enabled
      ? 'Dina vänner ser ungefär var du är, inte exakt punkt.'
      : 'Dina vänner ser din exakta plats och när du kör.';

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
                ? 'Tryck där ni ska träffas'
                : 'Dra pinnen för att justera'}
            </ThemedText>
          </View>
        )}

        {placingStep !== 'idle' && (
          <View style={[styles.placingBar, { bottom: tabBarInset }]}>
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
                  Placera här
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
              {
                bottom: tabBarInset + 76,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
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
              {
                bottom: tabBarInset,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
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
              onPress={() => setAddSheetOpen(true)}
              style={styles.actionBarBtn}
              hitSlop={8}
              accessibilityLabel="Släpp spot eller skapa träff"
            >
              <Ionicons name="add-circle" size={26} color={theme.brand} />
            </Pressable>
            <Pressable
              onPress={centerOnMe}
              style={styles.actionBarBtn}
              hitSlop={8}
              accessibilityLabel={following ? 'Följer dig' : 'Följ mig på kartan'}
              accessibilityState={{ selected: following }}
            >
              <Ionicons
                name={
                  locating && !following
                    ? 'ellipsis-horizontal'
                    : following
                      ? 'navigate'
                      : 'locate-outline'
                }
                size={22}
                color={following ? theme.brand : theme.text}
              />
            </Pressable>
          </View>
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
        <ActionSheet
          visible={!!selectedSpot}
          title={selectedSpot ? spotTitle(selectedSpot) : undefined}
          header={
            selectedSpot ? (
              <View style={styles.spotHeader}>
                <ThemedText type="small" themeColor="textSecondary">
                  {selectedSpot.kind === 'ragg'
                    ? selectedSpotHereNow > 0
                      ? `${selectedSpotHereNow} här nu`
                      : 'Ingen här just nu'
                    : 'Varning · försvinner av sig själv efter 2 timmar'}
                  {selectedSpot.visibility === 'all' ? ' · syns för alla' : ' · syns för vänner'}
                </ThemedText>
                {selectedSpot.kind === 'ragg' && userId ? (
                  <SpotPhotoStrip
                    spotId={selectedSpot.id}
                    userId={userId}
                    spotCreatorId={selectedSpot.creator_id}
                  />
                ) : null}
              </View>
            ) : null
          }
          onClose={() => setSelectedSpotId(null)}
          actions={
            selectedSpot
              ? [
                  ...(selectedSpot.kind === 'ragg'
                    ? [
                        {
                          label: uploadingPhoto ? 'Laddar upp bild …' : 'Lägg till bild',
                          icon: 'image-outline' as const,
                          disabled: uploadingPhoto,
                          hint: 'Syns i 24 timmar',
                          onPress: () => handleAddSpotPhoto(selectedSpot.id),
                        },
                      ]
                    : []),
                  ...(selectedSpot.creator_id === userId
                    ? [
                        {
                          label: 'Ta bort spot',
                          icon: 'trash-outline' as const,
                          destructive: true,
                          onPress: () => handleDeleteSpot(selectedSpot.id),
                        },
                      ]
                    : []),
                ]
              : []
          }
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
        <ActionSheet
          visible={meSheetOpen}
          onClose={() => setMeSheetOpen(false)}
          header={
            <View style={styles.meHeader}>
              <Avatar
                name={myProfile?.display_name ?? ''}
                imageUrl={myProfile?.avatar_url}
                size={56}
              />
              <View style={styles.meHeaderText}>
                <ThemedText type="smallBold">Så ser vännerna dig</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {meSharingText}
                </ThemedText>
              </View>
            </View>
          }
          actions={meActions}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

function latestCarColor(cars: Pick<Car, 'color' | 'created_at'>[] | undefined): string | null {
  return (
    [...(cars ?? [])]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .find((car) => car.color)?.color ?? null
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: Radius.pill,
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
    borderRadius: Radius.pill,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  placingBar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  placingBtn: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  placingBtnPrimary: { flex: 2 },
  meHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  meHeaderText: { flex: 1, gap: Spacing.one },
  spotHeader: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.three },
});
