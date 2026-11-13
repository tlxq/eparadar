import { supabase } from '@/lib/supabase';
import { signedUrl, signedUrls, storagePathFromPublicUrl } from '@/lib/storage';
import { lastActivity } from '@/lib/chat-state';
import { uploadFile } from '@/lib/image-upload';
import type { DbRow, DbTables } from '@/lib/db-types';

export type Profile = DbRow<'profiles'>;
export type Car = DbRow<'cars'>;
export type ProfileSummary = Pick<
  DbRow<'profiles'>,
  'id' | 'username' | 'display_name' | 'avatar_url'
>;
const PROFILE_CARD = 'id, username, display_name, avatar_url';
export const PROFILE_CARD_NO_USERNAME = 'id, display_name, avatar_url';

export type PostReaction = {
  user_id: string;
  emoji: string;
  profile: Pick<DbRow<'profiles'>, 'id' | 'display_name' | 'avatar_url'> | null;
};

export type PostPlace = Pick<DbRow<'post_places'>, 'lat' | 'lng' | 'expires_at'>;

export type Post = DbRow<'posts'> & {
  image_signed_url?: string | null;
  author: ProfileSummary | null;
  car: Pick<Car, 'id' | 'make' | 'model' | 'nickname' | 'photo_url'> | null;
  reactions: PostReaction[];
  place: PostPlace | null;
};

const POST_SELECT =
  `*, author:profiles!posts_author_id_fkey(${PROFILE_CARD}), car:cars(id, make, model, nickname, photo_url), reactions:post_reactions(user_id, emoji, profile:profiles!post_reactions_user_id_fkey(${PROFILE_CARD_NO_USERNAME})), place:post_places(lat, lng, expires_at)` as const;

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function deleteAccount(password: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { body: { password } });
  if (error) {
    const body = await (error.context as Response | undefined)?.json?.().catch(() => null);
    throw new Error(body?.error ?? 'Kontot kunde inte raderas. Försök igen.');
  }
  await supabase.auth.signOut({ scope: 'local' });
}

export const POSTS_PAGE_SIZE = 20;

export async function fetchPosts(page = 0, authorId?: string, carId?: string): Promise<Post[]> {
  const from = page * POSTS_PAGE_SIZE;
  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .range(from, from + POSTS_PAGE_SIZE - 1);
  if (authorId) query = query.eq('author_id', authorId);
  if (carId) query = query.eq('car_id', carId);
  const { data, error } = await query;
  if (error) throw error;
  return signPostImages((data ?? []) as unknown as Post[]);
}

export async function fetchPost(postId: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [post] = await signPostImages([data as unknown as Post]);
  return post;
}

export async function signPostImages<T extends { image_url: string | null }>(
  posts: T[],
): Promise<(T & { image_signed_url?: string | null })[]> {
  const paths = posts.map((post) => post.image_url).filter((path): path is string => !!path);
  if (paths.length === 0) return posts;
  const byPath = await signedUrls('post-images', paths);
  return posts.map((post) => ({
    ...post,
    image_signed_url: post.image_url ? (byPath.get(post.image_url) ?? null) : null,
  }));
}

export async function countMyPosts(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId);
  if (error) throw error;
  return count ?? 0;
}

export async function createPost(input: {
  body: string;
  carId: string | null;
  imageUrl?: string | null;
}): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const authorId = userData.user?.id;
  if (!authorId) throw new Error('Du måste vara inloggad.');

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: authorId,
      car_id: input.carId,
      body: input.body || null,
      image_url: input.imageUrl ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
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
  color?: string | null;
}) {
  const { error } = await supabase.from('cars').insert({
    owner_id: input.ownerId,
    make: input.make,
    model: input.model,
    year: input.year,
    nickname: input.nickname,
    photo_url: input.photoUrl ?? null,
    color: input.color ?? null,
  });
  if (error) throw error;
}

export async function fetchCar(carId: string): Promise<Car | null> {
  const { data, error } = await supabase.from('cars').select('*').eq('id', carId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCar(
  carId: string,
  input: {
    make: string;
    model: string;
    year: number | null;
    nickname: string | null;
    photoUrl: string | null;
    color: string | null;
  },
): Promise<void> {
  const { data, error } = await supabase
    .from('cars')
    .update({
      make: input.make,
      model: input.model,
      year: input.year,
      nickname: input.nickname,
      photo_url: input.photoUrl,
      color: input.color,
    })
    .eq('id', carId)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Det gick inte att spara. Är det din EPA?');
}

export async function removeCarPhoto(url: string | null): Promise<void> {
  await removeStoredFile('car-photos', url);
}

type MutualFriend = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;

export async function fetchMutualFriends(userId: string): Promise<MutualFriend[]> {
  const { data, error } = await supabase.rpc('mutual_friends', { p_user_id: userId });
  if (error) throw error;
  return data ?? [];
}

export async function setCarColor(carId: string, color: string | null): Promise<void> {
  const { error } = await supabase.from('cars').update({ color }).eq('id', carId);
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at, onboarded_at, profile_bios(bio)')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { profile_bios: bioRow, ...profile } = data;
  return { ...profile, bio: bioRow?.bio ?? null };
}

async function removeStoredFile(bucket: string, url: string | null) {
  const path = storagePathFromPublicUrl(bucket, url);
  if (path) await supabase.storage.from(bucket).remove([path]);
}

async function deleteOwnRow(table: 'posts' | 'cars', id: string) {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Det gick inte att ta bort. Är det ditt?');
}

export async function deletePost(post: Pick<Post, 'id' | 'image_url'>): Promise<void> {
  await deleteOwnRow('posts', post.id);
  if (post.image_url) await supabase.storage.from('post-images').remove([post.image_url]);
}

export async function deleteCar(car: Pick<Car, 'id' | 'photo_url'>): Promise<void> {
  await deleteOwnRow('cars', car.id);
  await removeStoredFile('car-photos', car.photo_url);
}

export async function removeAvatar(userId: string, avatarUrl: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
  if (error) throw error;
  await removeStoredFile('avatars', avatarUrl);
}

export async function completeOnboarding(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateProfile(input: {
  displayName: string;
  bio: string | null;
  avatarUrl?: string;
}) {
  const { error } = await supabase.rpc('update_my_profile', {
    p_display_name: input.displayName,
    p_bio: input.bio ?? '',
    p_avatar_url: input.avatarUrl,
  });
  if (error) throw error;
}

export type ConversationMember = {
  user_id: string;
  last_read_at: string | null;
  role: 'admin' | 'member';
  joined_at?: string;
  added_at?: string | null;
  profiles: ProfileSummary;
};

export type Conversation = DbRow<'conversations'> & {
  conversation_members: ConversationMember[];
  messages?: {
    body: string;
    created_at: string;
    sender_id: string;
    image_path: string | null;
    post_id: string | null;
  }[];
  muted_until?: string | null;
};

export type Message = DbRow<'messages'> & {
  sender: ProfileSummary | null;
  reactions: { user_id: string; emoji: string }[];
  pending?: boolean;
  failed?: boolean;
  localImageUri?: string;
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
  return signedUrl('group-avatars', path);
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
  const [{ data, error }, { data: mutes, error: mutesError }] = await Promise.all([
    supabase
      .from('conversations')
      .select(
        `*, conversation_members(user_id, last_read_at, role, added_at, profiles(${PROFILE_CARD})), messages(body, created_at, sender_id, image_path, post_id)`,
      )
      .order('created_at', { foreignTable: 'messages', ascending: false })
      .limit(1, { foreignTable: 'messages' }),
    supabase
      .from('conversation_mutes')
      .select('conversation_id, muted_until')
      .gt('muted_until', new Date().toISOString()),
  ]);
  if (error) throw error;
  if (mutesError) throw mutesError;
  const mutedUntil = new Map((mutes ?? []).map((mute) => [mute.conversation_id, mute.muted_until]));
  const conversations = ((data ?? []) as unknown as Conversation[]).map((conversation) => ({
    ...conversation,
    muted_until: mutedUntil.get(conversation.id) ?? null,
  }));
  return conversations.sort((a, b) => lastActivity(b) - lastActivity(a));
}

export const MUTE_FOREVER = 'infinity';

export async function setConversationMute(
  conversationId: string,
  until: Date | typeof MUTE_FOREVER | null,
): Promise<void> {
  const { error } = await supabase.rpc('set_conversation_mute', {
    p_conversation_id: conversationId,
    p_until: (until instanceof Date ? until.toISOString() : until) as string,
  });
  if (error) throw error;
}

export async function addConversationMembers(
  conversationId: string,
  userIds: string[],
): Promise<number> {
  const { data, error } = await supabase.rpc('add_conversation_members', {
    p_conversation_id: conversationId,
    p_user_ids: userIds,
  });
  if (error) throw error;
  return data ?? 0;
}

export async function fetchConversation(conversationId: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      `*, conversation_members(user_id, last_read_at, role, joined_at, added_at, profiles(${PROFILE_CARD}))`,
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
      `*, sender:profiles!messages_sender_id_fkey(${PROFILE_CARD}), reactions:message_reactions(user_id, emoji)`,
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function sendMessage(input: {
  id?: string;
  conversationId: string;
  senderId: string;
  body: string;
  imagePath?: string | null;
  postId?: string | null;
  meetupId?: string | null;
}) {
  const { error } = await supabase.from('messages').insert({
    id: input.id,
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    body: input.body,
    image_path: input.imagePath ?? null,
    post_id: input.postId ?? null,
    meetup_id: input.meetupId ?? null,
  });
  if (error && !(input.id && error.code === '23505')) throw error;
}

export async function toggleReaction(messageId: string, emoji: string): Promise<void> {
  const { error } = await supabase.rpc('toggle_reaction', {
    p_message_id: messageId,
    p_emoji: emoji,
  });
  if (error) throw error;
}

export async function chatImageUrl(path: string): Promise<string> {
  return signedUrl('chat-images', path);
}

type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

type FriendshipRow = Omit<DbRow<'friendships'>, 'status'> & {
  status: FriendshipStatus;
};

export type Friendship = FriendshipRow & {
  requester: ProfileSummary;
  addressee: ProfileSummary;
};

export function friendProfile(friendship: Friendship, myUserId: string) {
  return friendship.requester_id === myUserId ? friendship.addressee : friendship.requester;
}

const FRIENDSHIP_SELECT =
  `*, requester:profiles!friendships_requester_id_fkey(${PROFILE_CARD}), addressee:profiles!friendships_addressee_id_fkey(${PROFILE_CARD})` as const;

export async function fetchBlocked(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .eq('status', 'blocked')
    .eq('blocked_by', userId)
    .order('responded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Friendship[];
}

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

type LocationRow = DbRow<'locations'>;

export type FriendLocation = Omit<LocationRow, 'lat' | 'lng'> & {
  lat: number;
  lng: number;
  profile: ProfileSummary & {
    cars: Pick<Car, 'color' | 'created_at'>[];
  };
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
  heading?: number | null;
  moving?: boolean;
  sharingEnabled?: boolean;
}): Promise<void> {
  const payload: DbTables['locations']['Insert'] = {
    user_id: input.userId,
    lat: input.lat,
    lng: input.lng,
    heading: input.heading ?? null,
    moving: input.moving ?? false,
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

export type NotificationKind = 'messages' | 'friend_requests' | 'meets';
export type NotificationSettings = Record<NotificationKind, boolean>;

export async function fetchNotificationSettings(userId: string): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('messages, friend_requests, meets')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? { messages: true, friend_requests: true, meets: true };
}

export async function setNotificationSetting(
  userId: string,
  kind: NotificationKind,
  enabled: boolean,
): Promise<void> {
  const row: DbTables['notification_settings']['Insert'] = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  row[kind] = enabled;
  const { error } = await supabase
    .from('notification_settings')
    .upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function fetchFriendLocations(userId: string): Promise<FriendLocation[]> {
  const { data, error } = await supabase
    .from('locations')
    .select(`*, profile:profiles(${PROFILE_CARD}, cars(color, created_at))`)
    .eq('sharing_enabled', true)
    .not('lat', 'is', null)
    .neq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as unknown as FriendLocation[];
}
