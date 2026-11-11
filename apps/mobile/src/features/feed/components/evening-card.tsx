import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  isEvening,
  isLive,
  isTonight,
  plotPoints,
  type EveningPoint,
} from '@/features/feed/evening';
import { fetchSpots } from '@/features/map/spots';
import { useMeetups } from '@/features/meetups/hooks';
import { useUserId } from '@/hooks/use-user-id';
import { type FriendLocation } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const NIGHT = Colors.dark;
const MAP_HEIGHT = 112;
const GRID = [0.25, 0.5, 0.75];

const KIND_COLOR = {
  ragg: NIGHT.accent,
  meet: NIGHT.brandOnSurface,
  varning: NIGHT.warning,
} as const;

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function EveningCard({ friendsOut }: { friendsOut: FriendLocation[] }) {
  const userId = useUserId();
  const [width, setWidth] = useState(0);
  const evening = isEvening();
  const { data: spots } = useQuery({
    queryKey: queryKeys.spots(),
    queryFn: fetchSpots,
    enabled: !!userId && evening,
    refetchInterval: 60000,
  });
  const { data: meetups } = useMeetups();

  const tonight = useMemo(() => (meetups ?? []).filter((m) => isTonight(m.starts_at)), [meetups]);
  const live = useMemo(() => (spots ?? []).filter((s) => isLive(s.expires_at)), [spots]);
  const points = useMemo<EveningPoint[]>(
    () => [
      ...live.map((s) => ({
        id: s.id,
        kind: s.kind === 'varning' ? ('varning' as const) : ('ragg' as const),
        lat: s.lat,
        lng: s.lng,
      })),
      ...tonight.map((m) => ({ id: m.id, kind: 'meet' as const, lat: m.lat, lng: m.lng })),
    ],
    [live, tonight],
  );
  const plotted = useMemo(() => plotPoints(points, width, MAP_HEIGHT), [points, width]);

  if (!evening) return null;

  const spotCount = live.filter((s) => s.kind !== 'varning').length;
  const parts = [
    plural(friendsOut.length, 'kompis ute', 'kompisar ute'),
    spotCount > 0 ? plural(spotCount, 'spot', 'spots') : null,
    tonight.length > 0 ? plural(tonight.length, 'träff', 'träffar') : null,
  ].filter(Boolean);
  const calm = friendsOut.length === 0 && points.length === 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Kvällen: ${parts.join(', ')}. Öppna kartan.`}
      onPress={() => router.navigate('/karta')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: NIGHT.background, borderColor: NIGHT.separator },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.map} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={MAP_HEIGHT}>
            <Rect x={0} y={0} width={width} height={MAP_HEIGHT} fill={NIGHT.gradientTop} />
            {GRID.map((f) => (
              <Line
                key={`h${f}`}
                x1={0}
                x2={width}
                y1={MAP_HEIGHT * f}
                y2={MAP_HEIGHT * f}
                stroke={NIGHT.separator}
                strokeWidth={1}
              />
            ))}
            {GRID.map((f) => (
              <Line
                key={`v${f}`}
                x1={width * f}
                x2={width * f}
                y1={0}
                y2={MAP_HEIGHT}
                stroke={NIGHT.separator}
                strokeWidth={1}
              />
            ))}
            {plotted.map((p) => (
              <Circle
                key={`g${p.id}`}
                cx={p.x}
                cy={p.y}
                r={11}
                fill={KIND_COLOR[p.kind]}
                opacity={0.22}
              />
            ))}
            {plotted.map((p) => (
              <Circle
                key={p.id}
                cx={p.x}
                cy={p.y}
                r={5}
                fill={KIND_COLOR[p.kind]}
                stroke={NIGHT.background}
                strokeWidth={2}
              />
            ))}
          </Svg>
        ) : null}
        {calm ? (
          <View style={styles.calm}>
            <ThemedText type="caption" style={{ color: NIGHT.textSecondary }}>
              Lugnt än så länge. Bli först ut!
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Ionicons name="moon" size={16} color={NIGHT.brandOnSurface} />
        <View style={styles.footerText}>
          <ThemedText type="headline" style={{ color: NIGHT.text }}>
            Kvällen
          </ThemedText>
          <ThemedText type="caption" style={{ color: NIGHT.textSecondary }} numberOfLines={1}>
            {parts.join(' · ')}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={NIGHT.textSecondary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  pressed: { opacity: 0.85 },
  map: { height: MAP_HEIGHT },
  calm: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
  },
  footerText: { flex: 1, gap: Spacing.half },
});
