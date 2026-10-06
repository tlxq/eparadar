import { supabase } from '@/lib/supabase';
import { lastActivity } from '@/lib/chat-state';
import { uploadFile } from '@/lib/image-upload';
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
  last_read_at: string | null;
  role: 'admin' | 'member';
  joined_at?: string;
  profiles: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;
};

export type Conversation = {
  id: string;
  is_group: boolean;
  name: string | null;
  avatar_path: string | null;
  created_at: string;
  conversation_members: ConversationMember[];
  messages?: { body: string; created_at: string; sender_id: string; image_path: string | null }[];
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_path: string | null;
  created_at: string;
  sender: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
  reactions: { user_id: string; emoji: string }[];
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

export async function renameConversation(conversationId: string, name: string): Promise<void> {
  const { error } = await supabase.rpc('rename_conversation', {
    p_conversation_id: conversationId,
    p_name: name,
  });
  if (error) throw error;
}

export async function setGroupAvatar(conversationId: string, uri: string | null): Promise<void> {
  const path = uri
    ? await uploadFile('group-avatars', `${conversationId}/${Date.now()}`, uri)
    : null;
  const { data: previous, error } = await supabase.rpc('set_group_avatar', {
    p_conversation_id: conversationId,
    p_path: path as string,
  });
  if (error) {
    if (path) await supabase.storage.from('group-avatars').remove([path]);
    throw error;
  }
  if (previous && previous !== path) {
    await supabase.storage.from('group-avatars').remove([previous]);
  }
}

export async function groupAvatarUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('group-avatars')
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function leaveConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_conversation', { p_conversation_id: conversationId });
  if (error) throw error;
}

export async function removeMember(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_member', {
    p_conversation_id: conversationId,
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
}

export async function unsendMessage(messageId: string, imagePath?: string | null): Promise<void> {
  const { error } = await supabase.rpc('unsend_message', { p_message_id: messageId });
  if (error) throw error;
  if (imagePath) {
    await supabase.storage.from('chat-images').remove([imagePath]);
  }
}

export async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      '*, conversation_members(user_id, last_read_at, role, profiles(id, username, display_name, avatar_url)), messages(body, created_at, sender_id, image_path)',
    )
    .order('created_at', { foreignTable: 'messages', ascending: false })
    .limit(1, { foreignTable: 'messages' });
  if (error) throw error;
  const conversations = (data ?? []) as unknown as Conversation[];
  return conversations.sort((a, b) => lastActivity(b) - lastActivity(a));
}

export async function fetchConversation(conversationId: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      '*, conversation_members(user_id, last_read_at, role, joined_at, profiles(id, username, display_name, avatar_url))',
    )
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
    .select(
      '*, sender:profiles!messages_sender_id_fkey(id, username, display_name, avatar_url), reactions:message_reactions(user_id, emoji)',
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function sendMessage(input: {
  conversationId: string;
  senderId: string;
  body: string;
  imagePath?: string | null;
}) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    body: input.body,
    image_path: input.imagePath ?? null,
  });
  if (error) throw error;
}

export async function toggleReaction(messageId: string, emoji: string): Promise<void> {
  const { error } = await supabase.rpc('toggle_reaction', {
    p_message_id: messageId,
    p_emoji: emoji,
  });
  if (error) throw error;
}

export async function chatImageUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('chat-images').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
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
