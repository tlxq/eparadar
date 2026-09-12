import { supabase } from '@/lib/supabase';

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Car = {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  year: number | null;
  nickname: string | null;
  photo_url: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  car_id: string | null;
  body: string | null;
  image_url: string | null;
  created_at: string;
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
  car: Pick<Car, 'id' | 'make' | 'model' | 'nickname'> | null;
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
  });
  if (error) throw error;
  if (!data.session || !data.user) {
    throw new Error('Bekräfta din e-post och logga in för att slutföra registreringen.');
  }

  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    username: input.username,
    display_name: input.displayName,
  });
  if (profileError) throw profileError;
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
      '*, author:profiles(id, username, display_name, avatar_url), car:cars(id, make, model, nickname)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Post[];
}

export async function createPost(input: { body: string; carId: string | null }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const authorId = userData.user?.id;
  if (!authorId) throw new Error('Du måste vara inloggad.');

  const { error } = await supabase.from('posts').insert({
    author_id: authorId,
    car_id: input.carId,
    body: input.body,
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
  return (data ?? []) as Car[];
}

export async function createCar(input: {
  ownerId: string;
  make: string;
  model: string;
  year: number | null;
  nickname: string | null;
}) {
  const { error } = await supabase.from('cars').insert({
    owner_id: input.ownerId,
    make: input.make,
    model: input.model,
    year: input.year,
    nickname: input.nickname,
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
  return data as Profile | null;
}

export async function updateProfile(
  userId: string,
  input: { displayName: string; bio: string | null },
) {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: input.displayName, bio: input.bio })
    .eq('id', userId);
  if (error) throw error;
}
