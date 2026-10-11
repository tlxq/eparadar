import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle } from 'react-native-svg';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ScreenBackground } from '@/components/screen-background';
import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import {
  fetchFriendCode,
  formatFriendCode,
  friendCodeLink,
  type FriendCode,
} from '@/features/friends/friend-code';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query-keys';
import { useProfile } from '@/features/profile/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { ModalHeader } from '@/components/modal-header';

const QR_SIZE = 200;
const AVATAR_SIZE = 56;
const LIFETIME_MS = 10 * 60 * 1000;
const RING_SIZE = 22;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CARD_TOP = '#2F6FED';
const CARD_TEXT = '#FFFFFF';
const QR_INK = '#0B0E14';

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function CountdownRing({ fraction }: { fraction: number }) {
  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={RING_STROKE}
        fill="none"
      />
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        stroke={CARD_TEXT}
        strokeWidth={RING_STROKE}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
        strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
      />
    </Svg>
  );
}

export default function MyFriendCodeScreen() {
  const theme = useTheme();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const now = useNow();

  const { data: profile } = useProfile();

  const {
    data: friendCode,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.friendCode(userId),
    queryFn: () => fetchFriendCode(false),
    enabled: !!userId,
    gcTime: 0,
  });

  const rotate = useMutation({
    mutationFn: () => fetchFriendCode(true),
    onSuccess: (code: FriendCode) => queryClient.setQueryData(queryKeys.friendCode(userId), code),
  });

  const remainingMs = friendCode
    ? Math.min(LIFETIME_MS, new Date(friendCode.expires_at).getTime() - now)
    : 0;
  const expired = !!friendCode && remainingMs <= 0;

  useEffect(() => {
    if (expired) refetch();
  }, [expired, refetch]);

  const name = profile?.display_name ?? '';
  const ready = !!friendCode && !expired;

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ModalHeader title="Min kod" />

        <View style={styles.body}>
          <View style={[styles.card, { backgroundColor: CARD_TOP }]}>
            <View style={styles.qrFrame}>
              {ready ? (
                <View accessible accessibilityLabel={`QR-kod för ${name}`}>
                  <QRCode
                    value={friendCodeLink(friendCode.code)}
                    size={QR_SIZE}
                    color={QR_INK}
                    backgroundColor="#FFFFFF"
                    ecl="H"
                    quietZone={0}
                  />
                  <View style={styles.qrAvatar}>
                    <View style={styles.qrAvatarBorder}>
                      <Avatar
                        name={name || '?'}
                        imageUrl={profile?.avatar_url}
                        size={AVATAR_SIZE}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <Skeleton width={QR_SIZE} height={QR_SIZE} radius={Radius.md} />
              )}
            </View>
            <ThemedText type="subtitle" style={styles.cardText}>
              {name}
            </ThemedText>
            {ready ? (
              <>
                <View style={styles.codeChip}>
                  <ThemedText
                    style={styles.code}
                    accessibilityLabel={`Kod ${friendCode.code.split('').join(' ')}`}
                  >
                    {formatFriendCode(friendCode.code)}
                  </ThemedText>
                </View>
                <View style={styles.timer}>
                  <CountdownRing fraction={Math.min(1, remainingMs / LIFETIME_MS)} />
                  <ThemedText type="caption" style={styles.cardText}>
                    Giltig i {formatRemaining(remainingMs)}
                  </ThemedText>
                </View>
              </>
            ) : (
              <Skeleton width={120} height={32} radius={Radius.md} />
            )}
          </View>

          {isError ? (
            <ThemedText type="error" style={styles.center}>
              Koden kunde inte hämtas. Kontrollera din anslutning.
            </ThemedText>
          ) : null}

          <View style={[styles.note, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.brandOnSurface} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.noteText}>
              Visa bara koden för folk du träffar på riktigt. Den byts ut efter 10 minuter, så en
              skärmdump slutar fungera.
            </ThemedText>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            label="Ny kod"
            icon="refresh"
            variant="secondary"
            loading={rotate.isPending}
            onPress={() => (isError ? refetch() : rotate.mutate())}
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.three, paddingTop: Spacing.two },
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.xl + Spacing.one,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  qrFrame: { backgroundColor: '#FFFFFF', borderRadius: Radius.lg, padding: Spacing.three },
  qrAvatar: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrAvatarBorder: { borderRadius: AVATAR_SIZE, borderWidth: 4, borderColor: '#FFFFFF' },
  cardText: { color: CARD_TEXT },
  codeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  code: {
    color: CARD_TEXT,
    fontFamily: Fonts.mono,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 3,
    fontWeight: '700',
  },
  timer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  center: { textAlign: 'center' },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  noteText: { flex: 1 },
  footer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
