create table locations (
  user_id uuid primary key references profiles on delete cascade,
  lat double precision not null,
  lng double precision not null,
  sharing_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table locations enable row level security;

create policy "users manage their own location"
  on locations for insert
  with check (auth.uid() = user_id);

create policy "users update their own location"
  on locations for update
  using (auth.uid() = user_id);

create policy "users delete their own location"
  on locations for delete
  using (auth.uid() = user_id);

create policy "owner and friends view shared locations"
  on locations for select
  using (auth.uid() = user_id or (sharing_enabled and is_friend(auth.uid(), user_id)));

alter table locations replica identity full;

alter publication supabase_realtime add table locations;
