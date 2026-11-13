import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { Radius, Spacing } from '@/constants/theme';
import { PostActionsSheet } from '@/features/feed/components/post-actions-sheet';
import { PostReactors } from '@/features/feed/components/post-reactors';
import { PostItem } from '@/features/feed/components/post-item';
import { fetchPost, type Post } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { SIGNED_URL_REFRESH_MS } from '@/lib/queryClient';
import { loadError } from '@/constants/strings';

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selected, setSelected] = useState<Post | null>(null);
  const {
    data: post,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.post(id),
    queryFn: () => fetchPost(id!),
    enabled: !!id,
    refetchInterval: SIGNED_URL_REFRESH_MS,
  });

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScreenHeader title="Post" />
        {isLoading ? (
          <View style={styles.skeleton}>
            <Skeleton width="50%" />
            <Skeleton height={260} radius={Radius.lg} />
            <Skeleton width="80%" />
          </View>
        ) : isError && !post ? (
          <ErrorState message={loadError('Posten')} onRetry={refetch} />
        ) : !post ? (
          <EmptyState
            icon="eye-off-outline"
            title="Posten finns inte"
            message="Den kan ha tagits bort, eller så syns den bara för personens kompisar."
            action={{ label: 'Till flödet', onPress: () => router.navigate('/') }}
          />
        ) : (
          <ScrollView>
            <PostItem post={post} onMore={() => setSelected(post)} />
            <PostReactors post={post} />
          </ScrollView>
        )}
      </SafeAreaView>
      <PostActionsSheet post={selected} onClose={() => setSelected(null)} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skeleton: { padding: Spacing.three, gap: Spacing.three },
});
