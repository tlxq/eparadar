import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { IconButton } from '@/components/icon-button';
import { ImageViewer } from '@/components/image-viewer';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { ReactionBar } from '@/features/feed/components/reaction-bar';
import { useTheme } from '@/hooks/use-theme';
import { type Post } from '@/lib/api';
import { formatPostAge } from '@/lib/relative-time';
import { openCar, openPerson } from '@/store/person-sheet';

export function carLabel(car: Post['car']) {
  return car ? (car.nickname ?? `${car.make} ${car.model}`) : null;
}

export function showOnMap(place: NonNullable<Post['place']>) {
  router.navigate({
    pathname: '/karta',
    params: { focusLat: String(place.lat), focusLng: String(place.lng) },
  });
}

export function PostItem({ post, onMore }: { post: Post; onMore?: () => void }) {
  const theme = useTheme();
  const [viewerOpen, setViewerOpen] = useState(false);
  const authorName = post.author?.display_name ?? 'Okänd användare';
  const car = carLabel(post.car);
  const age = formatPostAge(post.created_at);

  return (
    <View style={[styles.post, { borderBottomColor: theme.separator }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Visa ${authorName}`}
          disabled={!post.author}
          onPress={() => post.author && openPerson(post.author.id)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Avatar name={authorName} imageUrl={post.author?.avatar_url} size={40} />
        </Pressable>
        <View style={styles.headerText}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Visa ${authorName}`}
            disabled={!post.author}
            onPress={() => post.author && openPerson(post.author.id)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedText type="headline" numberOfLines={1}>
              {authorName}
            </ThemedText>
          </Pressable>
          <View style={styles.meta}>
            {car ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Visa EPA ${car}`}
                  onPress={() => post.car && openCar(post.car.id)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.car, pressed && styles.pressed]}
                >
                  <Ionicons name="car-sport" size={13} color={theme.brandOnSurface} />
                  <ThemedText
                    type="caption"
                    numberOfLines={1}
                    style={[styles.carText, { color: theme.brandOnSurface }]}
                  >
                    {car}
                  </ThemedText>
                </Pressable>
                <ThemedText type="caption" themeColor="textSecondary">
                  ·
                </ThemedText>
              </>
            ) : null}
            <ThemedText type="caption" themeColor="textSecondary">
              {age}
            </ThemedText>
          </View>
        </View>
        {onMore ? (
          <IconButton
            icon="ellipsis-horizontal"
            variant="plain"
            size={32}
            accessibilityLabel="Fler val för posten"
            onPress={onMore}
          />
        ) : null}
      </View>
      {post.image_signed_url ? (
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={`Bild från ${authorName}, tryck för att visa stort`}
          onPress={() => setViewerOpen(true)}
        >
          <Image
            source={{ uri: post.image_signed_url }}
            style={[styles.image, { backgroundColor: theme.backgroundElement }]}
          />
        </Pressable>
      ) : null}
      {post.body ? (
        <ThemedText type={post.image_signed_url ? 'small' : 'default'}>{post.body}</ThemedText>
      ) : null}
      {post.place ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Visa platsen på kartan"
          onPress={() => showOnMap(post.place!)}
          style={({ pressed }) => [
            styles.place,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="location" size={14} color={theme.accent} />
          <ThemedText type="caption">Släppt på kartan · visa</ThemedText>
        </Pressable>
      ) : null}
      <ReactionBar post={post} />
      <ImageViewer
        uri={viewerOpen ? (post.image_signed_url ?? null) : null}
        label={`Bild från ${authorName}`}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  post: {
    gap: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerText: { flex: 1, gap: Spacing.half },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  car: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, flexShrink: 1 },
  carText: { flexShrink: 1 },
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.lg },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
});
