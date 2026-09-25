import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type DbTables = Database['public']['Tables'];

export type Profile = DbTables['profiles']['Row'];
export type Car = DbTables['cars']['Row'];

export type Post = DbTables['posts']['Row'] & {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
  car: Pick<Car, 'id' | 'make' | 'model' | 'nickname' | 'photo_url'> | null;
};

export async function signUpWithProfile(input: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username: input.username,
        display_name: input.displayName,
      },
    },
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error('Bekräfta din e-post och logga in för att slutföra registreringen.');
  }
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      '*, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url), car:cars(id, make, model, nickname, photo_url)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Post[];
}

export async function createPost(input: {
  body: string;
  carId: string | null;
  imageUrl?: string | null;
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const authorId = userData.user?.id;
  if (!authorId) throw new Error('Du måste vara inloggad.');

  const { error } = await supabase.from('posts').insert({
    author_id: authorId,
    car_id: input.carId,
    body: input.body,
    image_url: input.imageUrl ?? null,
  });
  if (error) throw error;
}

export async function fetchMyCars(userId: string): Promise<Car[]> {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCar(input: {
  ownerId: string;
  make: string;
  model: string;
  year: number | null;
  nickname: string | null;
  photoUrl?: string | null;
}) {
  const { error } = await supabase.from('cars').insert({
    owner_id: input.ownerId,
    make: input.make,
    model: input.model,
    year: input.year,
    nickname: input.nickname,
    photo_url: input.photoUrl ?? null,
  });
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  input: { displayName: string; bio: string | null; avatarUrl?: string },
) {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: input.displayName, bio: input.bio, avatar_url: input.avatarUrl })
    .eq('id', userId);
  if (error) throw error;
}

export type ConversationMember = {
  user_id: string;
  profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
};

export type Conversation = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_at: string;
  conversation_members: ConversationMember[];
  messages?: { body: string; created_at: string }[];
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
};

export function conversationTitle(conversation: Conversation, myUserId: string): string {
  if (conversation.is_group) {
    return conversation.name ?? 'Gruppchatt';
  }
  const other = conversation.conversation_members.find((member) => member.user_id !== myUserId);
  return other?.profiles.display_name ?? 'Okänd användare';
}

export function conversationAvatarUrl(conversation: Conversation, myUserId: string): string | null {
  if (conversation.is_group) return null;
  const other = conversation.conversation_members.find((member) => member.user_id !== myUserId);
  return other?.profiles.avatar_url ?? null;
}

export async function searchUsers(query: string, excludeUserId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .neq('id', excludeUserId)
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      '*, conversation_members(user_id, profiles(id, username, display_name, avatar_url)), messages(body, created_at)',
    )
    .order('created_at', { ascending: false })
    .order('created_at', { foreignTable: 'messages', ascending: false })
    .limit(1, { foreignTable: 'messages' });
  if (error) throw error;
  return (data ?? []) as unknown as Conversation[];
}

export async function fetchConversation(conversationId: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, conversation_members(user_id, profiles(id, username, display_name, avatar_url))')
    .eq('id', conversationId)
    .single();
  if (error) throw error;
  return data as unknown as Conversation;
}

export async function createConversation(input: {
  otherUserIds: string[];
  groupName?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_conversation', {
    other_user_ids: input.otherUserIds,
    group_name: input.groupName ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles(id, username, display_name, avatar_url)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  body: string;
}) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    body: input.body,
  });
  if (error) throw error;
}

export type FriendshipStatus = 'pending' | 'accepted';

export type FriendshipRow = Omit<DbTables['friendships']['Row'], 'status'> & {
  status: FriendshipStatus;
};

export type Friendship = FriendshipRow & {
  requester: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  addressee: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
};

export function friendProfile(friendship: Friendship, myUserId: string) {
  return friendship.requester_id === myUserId ? friendship.addressee : friendship.requester;
}

const FRIENDSHIP_SELECT =
  '*, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url)';

export async function fetchFriends(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('responded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Friendship[];
}

export async function fetchPendingRequests(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Friendship[];
}

export async function fetchOutgoingRequests(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .eq('requester_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Friendship[];
}

export async function sendFriendRequest(targetUserId: string): Promise<FriendshipRow> {
  const { data, error } = await supabase.rpc('send_friend_request', {
    target_user_id: targetUserId,
  });
  if (error) throw error;
  return data as FriendshipRow;
}

export async function respondToFriendRequest(requestId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_to_friend_request', {
    request_id: requestId,
    accept,
  });
  if (error) throw error;
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}

export type LocationRow = DbTables['locations']['Row'];

export type FriendLocation = LocationRow & {
  profile: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
};

export async function fetchMyLocation(userId: string): Promise<LocationRow | null> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertLocation(input: {
  userId: string;
  lat: number;
  lng: number;
  sharingEnabled?: boolean;
}): Promise<void> {
  const payload: DbTables['locations']['Insert'] = {
    user_id: input.userId,
    lat: input.lat,
    lng: input.lng,
    updated_at: new Date().toISOString(),
  };
  if (input.sharingEnabled !== undefined) {
    payload.sharing_enabled = input.sharingEnabled;
  }
  const { error } = await supabase.from('locations').upsert(payload, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function setLocationSharing(userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('locations')
    .update({ sharing_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function setLocationApproximate(userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('locations')
    .update({ approximate_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function fetchFriendLocations(userId: string): Promise<FriendLocation[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*, profile:profiles(id, username, display_name, avatar_url)')
    .eq('sharing_enabled', true)
    .neq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as unknown as FriendLocation[];
}

export async function searchUsersToAdd(query: string, userId: string): Promise<Profile[]> {
  const { data: related, error: relatedError } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (relatedError) throw relatedError;

  const excludeIds = Array.from(
    new Set([userId, ...(related ?? []).flatMap((r) => [r.requester_id, r.addressee_id])]),
  );

  let request = supabase.from('profiles').select('*').ilike('username', `%${query}%`).limit(20);
  if (excludeIds.length) {
    request = request.not('id', 'in', `(${excludeIds.join(',')})`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}
