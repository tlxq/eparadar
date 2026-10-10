create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from friendships f
    where f.user_a = least(a, b) and f.user_b = greatest(a, b) and f.status = 'blocked'
  );
$$;

grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;

create table spots (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles on delete cascade,
  kind text not null check (kind in ('ragg', 'varning')),
  warning_type text check (warning_type in ('vagarbete', 'halka', 'grop', 'avstangt')),
  name text check (char_length(btrim(name)) between 1 and 40),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  visibility text not null default 'friends' check (visibility in ('friends', 'all')),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint spots_kind_fields check (
    (kind = 'ragg' and name is not null and warning_type is null)
    or (kind = 'varning' and warning_type is not null and name is null)
  )
);

create index spots_creator_id_idx on spots (creator_id);
create index spots_expires_at_idx on spots (expires_at);

create or replace function set_spot_expiry()
returns trigger
language plpgsql
as $$
begin
  new.created_at := now();
  if new.kind = 'varning' then
    new.expires_at := new.created_at + interval '2 hours';
  else
    new.expires_at := null;
  end if;
  return new;
end;
$$;

create trigger spots_set_expiry
  before insert on spots
  for each row
  execute function set_spot_expiry();

alter table spots enable row level security;

create policy "people see live spots shared with them"
  on spots for select
  using (
    (expires_at is null or expires_at > now())
    and (
      creator_id = auth.uid()
      or (visibility = 'friends' and is_friend(auth.uid(), creator_id))
      or (visibility = 'all' and auth.uid() is not null and not is_blocked_between(auth.uid(), creator_id))
    )
  );

create policy "people create their own spots"
  on spots for insert
  with check (creator_id = auth.uid());

create policy "people remove their own spots"
  on spots for delete
  using (creator_id = auth.uid());

alter table spots replica identity full;

alter publication supabase_realtime add table spots;
