create table nearby_presence (
  user_id uuid primary key references profiles on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  seen_at timestamptz not null default now()
);

alter table nearby_presence enable row level security;

create index nearby_presence_seen_at_idx on nearby_presence (seen_at);

create or replace function public.scan_nearby(p_lat double precision, p_lng double precision)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  request_state text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Ogiltig position.';
  end if;

  delete from nearby_presence np where np.seen_at < now() - interval '2 minutes';

  insert into nearby_presence (user_id, lat, lng, seen_at)
  values (caller, p_lat, p_lng, now())
  on conflict on constraint nearby_presence_pkey do update
    set lat = excluded.lat, lng = excluded.lng, seen_at = excluded.seen_at;

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    case
      when f.id is null then 'none'
      when f.requester_id = caller then 'sent'
      else 'received'
    end
  from nearby_presence np
  join profiles p on p.id = np.user_id
  left join friendships f
    on f.user_a = least(caller, np.user_id) and f.user_b = greatest(caller, np.user_id)
  where np.user_id <> caller
    and np.seen_at > now() - interval '20 seconds'
    and np.lat between p_lat - 0.002 and p_lat + 0.002
    and 6371000 * acos(least(1, greatest(-1,
      cos(radians(p_lat)) * cos(radians(np.lat)) * cos(radians(np.lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(np.lat))
    ))) <= 100
    and (f.id is null or f.status = 'pending')
  order by p.display_name
  limit 30;
end;
$$;

grant execute on function public.scan_nearby(double precision, double precision) to authenticated;

create or replace function public.leave_nearby()
returns void
language sql
security definer
set search_path = public
as $$
  delete from nearby_presence where user_id = auth.uid();
$$;

grant execute on function public.leave_nearby() to authenticated;
