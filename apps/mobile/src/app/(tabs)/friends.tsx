import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/empty-state';
import { IconButton } from '@/components/icon-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenHeader } from '@/components/screen-header';
import { Spacing } from '@/constants/theme';
import { useFriendRequests, useFriends, useOutgoingRequests } from '@/features/friends/hooks';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useUserId } from '@/hooks/use-user-id';
import { useQueryErrorToast } from '@/hooks/use-query-error-toast';
import {
  FriendRow,
  FriendsSkeleton,
  OutgoingRequestRow,
  RequestRow,
  SectionLabel,
} from '@/features/friends/components/friend-rows';

export default function FriendsScreen() {
  const userId = useUserId();
  const tabBarInset = useTabBarInset();

  const { data: friends, isLoading: friendsLoading, isError, refetch, isRefetching } = useFriends();

  const { data: requests } = useFriendRequests();

  const { data: outgoingRequests } = useOutgoingRequests();

  useQueryErrorToast(isError, 'Kunde inte ladda dina vänner.', refetch);

  const friendCount = friends?.length ?? 0;

  return (
    <ScreenBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={friends ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <FriendRow friendship={item} myUserId={userId!} />}
          contentContainerStyle={{ paddingBottom: tabBarInset }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListHeaderComponent={
            <>
              <View style={styles.headerBlock}>
                <ScreenHeader
                  title="Vänner"
                  actions={
                    <IconButton
                      icon="person-add-outline"
                      accessibilityLabel="Lägg till vän"
                      onPress={() => router.push('/friends/add')}
                    />
                  }
                />
              </View>
              {requests && requests.length > 0 ? (
                <View style={styles.section}>
                  <SectionLabel>{`FÖRFRÅGNINGAR · ${requests.length}`}</SectionLabel>
                  {requests.map((request) => (
                    <RequestRow key={request.id} request={request} myUserId={userId!} />
                  ))}
                </View>
              ) : null}
              {outgoingRequests && outgoingRequests.length > 0 ? (
                <View style={styles.section}>
                  <SectionLabel>SKICKADE</SectionLabel>
                  {outgoingRequests.map((request) => (
                    <OutgoingRequestRow key={request.id} request={request} myUserId={userId!} />
                  ))}
                </View>
              ) : null}
              {friendCount > 0 ? (
                <SectionLabel>{`DINA VÄNNER · ${friendCount}`}</SectionLabel>
              ) : null}
            </>
          }
          ListEmptyComponent={
            friendsLoading ? (
              <FriendsSkeleton />
            ) : isError ? null : (
              <EmptyState
                icon="people-outline"
                title="Inga vänner än"
                message="Lägg till folk du träffat på en träff eller som era kompisar redan känner."
                action={{
                  label: 'Lägg till vän',
                  icon: 'person-add-outline',
                  onPress: () => router.push('/friends/add'),
                }}
              />
            )
          }
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerBlock: { paddingHorizontal: Spacing.three },
  section: { marginBottom: Spacing.three },
});
