import { Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { Skeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { meetupVibe } from '@/features/map/map-icons';
import { fetchSharedMeetup } from '@/features/meetups/api';
import { formatMeetupTime } from '@/features/meetups/time';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query-keys';

const CARD_WIDTH = 240;

type MeetupCardProps = {
  meetupId: string;
  onLongPress: () => void;
};

export function MeetupCard({ meetupId, onLongPress }: MeetupCardProps) {
  const theme = useTheme();
  const { data: meetup, isLoading } = useQuery({
    queryKey: queryKeys.sharedMeetup(meetupId),
    queryFn: () => fetchSharedMeetup(meetupId),
  });

  if (isLoading) return <Skeleton width={CARD_WIDTH} height={64} radius={Radius.lg} />;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={meetup ? `Öppna träffen ${meetup.title}` : 'Träffen går inte att öppna'}
      disabled={!meetup}
      onPress={() => meetup && router.push(`/meetups/${meetup.id}`)}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.separator },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.backgroundSelected }]}>
        {meetup ? (
          <SvgXml xml={meetupVibe(meetup.vibe).icon} width={28} height={28} />
        ) : (
          <Ionicons name="calendar-outline" size={22} color={theme.textSecondary} />
        )}
      </View>
      <View style={styles.text}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {meetup ? meetup.title : 'Träffen finns inte längre'}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {meetup ? formatMeetupTime(meetup.starts_at) : 'Eller så är den bara för andra kompisar.'}
        </ThemedText>
      </View>
      {meetup ? <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: { opacity: 0.8 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: Spacing.half },
});
