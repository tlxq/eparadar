create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table push_tokens enable row level security;

create policy "users insert their own push tokens"
  on push_tokens for insert
  with check (auth.uid() = user_id);

create policy "users view their own push tokens"
  on push_tokens for select
  using (auth.uid() = user_id);

create policy "users delete their own push tokens"
  on push_tokens for delete
  using (auth.uid() = user_id);
