create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete set null,
  event_name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table analytics_events enable row level security;

create policy "anyone can record their own events"
  on analytics_events for insert
  with check (user_id is null or user_id = auth.uid());
