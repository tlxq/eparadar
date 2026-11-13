import { PROFILE_CARD_NO_USERNAME, signPostImages, type ProfileSummary } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export async function addPostReaction(postId: string, userId: string, emoji: string) {
  const { error } = await supabase
    .from('post_reactions')
    .insert({ post_id: postId, user_id: userId, emoji });
  if (error && error.code !== '23505') throw error;
}

export async function removePostReaction(postId: string, userId: string, emoji: string) {
  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('emoji', emoji);
  if (error) throw error;
}

export async function dropPostOnMap(input: {
  postId: string;
  authorId: string;
  lat: number;
  lng: number;
}) {
  const { error } = await supabase.from('post_places').insert({
    post_id: input.postId,
    author_id: input.authorId,
    lat: input.lat,
    lng: input.lng,
  });
  if (error) throw error;
}

export type MapPost = {
  post_id: string;
  lat: number;
  lng: number;
  expires_at: string;
  image_url: string | null;
  image_signed_url?: string | null;
  author: Pick<ProfileSummary, 'id' | 'display_name' | 'avatar_url'> | null;
};

export async function fetchMapPosts(): Promise<MapPost[]> {
  const { data, error } = await supabase
    .from('post_places')
    .select(
      `post_id, lat, lng, expires_at, post:posts!inner(image_url, author:profiles!posts_author_id_fkey(${PROFILE_CARD_NO_USERNAME}))`,
    )
    .gt('expires_at', new Date().toISOString());
  if (error) throw error;
  const rows = (data ?? []).map((row) => {
    const post = row.post as unknown as {
      image_url: string | null;
      author: MapPost['author'];
    };
    return {
      post_id: row.post_id,
      lat: row.lat,
      lng: row.lng,
      expires_at: row.expires_at,
      image_url: post.image_url,
      author: post.author,
    };
  });
  return signPostImages(rows);
}

export async function sharePostToChat(input: {
  conversationId: string;
  senderId: string;
  postId: string;
}) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    body: '',
    post_id: input.postId,
  });
  if (error) throw error;
}
