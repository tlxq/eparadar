import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import { fetchPendingRequests } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth';

export default function TabsLayout() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const queryClient = useQueryClient();

  const { data: pendingRequests } = useQuery({
    queryKey: queryKeys.friendRequests(userId),
    queryFn: () => fetchPendingRequests(userId!),
    enabled: !!userId,
  });
  const pendingCount = pendingRequests?.length ?? 0;

  function invalidateFriendships() {
    queryClient.invalidateQueries({ queryKey: queryKeys.friends(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.friendRequests(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.outgoingRequests(userId) });
  }

  useRealtimeTable({
    channelName: `friendships:requester:${userId}`,
    table: 'friendships',
    filter: `requester_id=eq.${userId}`,
    enabled: !!userId,
    onChange: invalidateFriendships,
  });

  useRealtimeTable({
    channelName: `friendships:addressee:${userId}`,
    table: 'friendships',
    filter: `addressee_id=eq.${userId}`,
    enabled: !!userId,
    onChange: invalidateFriendships,
  });

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Flöde',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chatt',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Vänner',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="karta"
        options={{
          title: 'Karta',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
