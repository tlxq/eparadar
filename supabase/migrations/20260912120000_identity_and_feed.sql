create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  make text not null,
  model text not null,
  year integer,
  nickname text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles on delete cascade,
  car_id uuid references cars on delete set null,
  body text,
  image_url text,
  created_at timestamptz not null default now()
);

create table likes (
  post_id uuid not null references posts on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table profiles enable row level security;
alter table cars enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;

create policy "profiles are readable by everyone"
  on profiles for select
  using (true);

create policy "users manage their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "users update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "cars are readable by everyone"
  on cars for select
  using (true);

create policy "users manage their own cars"
  on cars for insert
  with check (auth.uid() = owner_id);

create policy "users update their own cars"
  on cars for update
  using (auth.uid() = owner_id);

create policy "users delete their own cars"
  on cars for delete
  using (auth.uid() = owner_id);

create policy "posts are readable by everyone"
  on posts for select
  using (true);

create policy "users manage their own posts"
  on posts for insert
  with check (auth.uid() = author_id);

create policy "users update their own posts"
  on posts for update
  using (auth.uid() = author_id);

create policy "users delete their own posts"
  on posts for delete
  using (auth.uid() = author_id);

create policy "likes are readable by everyone"
  on likes for select
  using (true);

create policy "users manage their own likes"
  on likes for insert
  with check (auth.uid() = user_id);

create policy "users remove their own likes"
  on likes for delete
  using (auth.uid() = user_id);
