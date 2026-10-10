alter table locations
  add column status_text text check (char_length(btrim(status_text)) between 1 and 30),
  add column status_expires_at timestamptz;

create or replace function set_status_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.status_text is null then
    new.status_expires_at := null;
  elsif tg_op = 'INSERT'
    or new.status_text is distinct from old.status_text
    or new.status_expires_at is distinct from old.status_expires_at then
    new.status_text := btrim(new.status_text);
    new.status_expires_at := now() + interval '1 hour';
  end if;
  return new;
end;
$$;

create trigger locations_status_expiry
  before insert or update on locations
  for each row
  execute function set_status_expiry();

create table heat_points (
  user_id uuid not null references profiles on delete cascade,
  cell_lat double precision not null,
  cell_lng double precision not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, cell_lat, cell_lng)
);

create index heat_points_seen_at_idx on heat_points (seen_at);

alter table heat_points enable row level security;

create or replace function record_heat_point()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sharing_enabled then
    insert into heat_points (user_id, cell_lat, cell_lng, seen_at)
    values (new.user_id, round(new.lat / 0.003) * 0.003, round(new.lng / 0.003) * 0.003, now())
    on conflict (user_id, cell_lat, cell_lng) do update set seen_at = excluded.seen_at;
  else
    delete from heat_points where user_id = new.user_id;
  end if;
  delete from heat_points where seen_at < now() - interval '12 hours';
  return null;
end;
$$;

create trigger locations_record_heat
  after insert or update on locations
  for each row
  execute function record_heat_point();

create or replace function public.evening_heat()
returns table (lat double precision, lng double precision, people integer)
language sql
security definer
stable
set search_path = public
as $$
  select h.cell_lat, h.cell_lng, count(distinct h.user_id)::int
  from heat_points h
  where h.seen_at > now() - interval '6 hours'
    and h.user_id <> auth.uid()
    and is_friend(auth.uid(), h.user_id)
  group by h.cell_lat, h.cell_lng
  having count(distinct h.user_id) >= 2;
$$;

revoke execute on function public.evening_heat() from public, anon;
grant execute on function public.evening_heat() to authenticated;
