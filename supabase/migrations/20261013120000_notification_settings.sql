create table notification_settings (
  user_id uuid primary key references profiles on delete cascade,
  messages boolean not null default true,
  friend_requests boolean not null default true,
  meets boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table notification_settings enable row level security;

revoke all on notification_settings from anon;
revoke delete, truncate on notification_settings from authenticated;

create policy "people read their own notification settings"
  on notification_settings for select to authenticated
  using (auth.uid() = user_id);

create policy "people create their own notification settings"
  on notification_settings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "people change their own notification settings"
  on notification_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
