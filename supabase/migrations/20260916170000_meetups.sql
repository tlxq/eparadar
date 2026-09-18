create table meetups (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles on delete cascade,
  title text not null,
  vibe_emoji text not null default '🔥',
  lat double precision not null,
  lng double precision not null,
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index meetups_starts_at_idx on meetups (starts_at);

alter table meetups enable row level security;

create policy "anyone can view meetups"
  on meetups for select
  using (true);

create policy "authenticated users create meetups"
  on meetups for insert
  with check (auth.uid() = creator_id);

create policy "creator updates their meetup"
  on meetups for update
  using (auth.uid() = creator_id);

create policy "creator deletes their meetup"
  on meetups for delete
  using (auth.uid() = creator_id);

alter table meetups replica identity full;
alter publication supabase_realtime add table meetups;

create table meetup_interests (
  meetup_id uuid not null references meetups on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

alter table meetup_interests enable row level security;

create policy "anyone can view interest"
  on meetup_interests for select
  using (true);

create policy "users mark their own interest"
  on meetup_interests for insert
  with check (auth.uid() = user_id);

create policy "users remove their own interest"
  on meetup_interests for delete
  using (auth.uid() = user_id);

alter table meetup_interests replica identity full;
alter publication supabase_realtime add table meetup_interests;

create table meetup_checkins (
  meetup_id uuid not null references meetups on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  checked_in_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

alter table meetup_checkins enable row level security;

create policy "anyone can view checkins"
  on meetup_checkins for select
  using (true);

alter table meetup_checkins replica identity full;
alter publication supabase_realtime add table meetup_checkins;

create or replace function public.check_in_at_meetup(p_meetup_id uuid, p_lat double precision, p_lng double precision)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  m meetups;
  distance_m double precision;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into m from meetups where id = p_meetup_id;
  if m.id is null then
    raise exception 'Träffen hittades inte.';
  end if;

  distance_m := 6371000 * acos(
    least(1, greatest(-1,
      cos(radians(p_lat)) * cos(radians(m.lat)) * cos(radians(m.lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(m.lat))
    ))
  );

  if distance_m <= 150 then
    insert into meetup_checkins (meetup_id, user_id, checked_in_at)
    values (p_meetup_id, caller, now())
    on conflict (meetup_id, user_id) do update set checked_in_at = now();
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.check_in_at_meetup(uuid, double precision, double precision) to authenticated;

create view public.meetups_with_stats
with (security_invoker = true)
as
select
  m.*,
  coalesce(i.interest_count, 0) as interest_count,
  coalesce(c.here_now_count, 0) as here_now_count
from meetups m
left join (
  select meetup_id, count(*) as interest_count
  from meetup_interests
  group by meetup_id
) i on i.meetup_id = m.id
left join (
  select meetup_id, count(*) as here_now_count
  from meetup_checkins
  where checked_in_at > now() - interval '30 minutes'
  group by meetup_id
) c on c.meetup_id = m.id;

grant select on public.meetups_with_stats to authenticated;
