alter function public.fuzz_location_before_write() set search_path = public;
alter function public.set_status_expiry() set search_path = public;
alter function public.set_spot_photo_expiry() set search_path = public;

revoke execute on function public.fuzz_location_before_write() from public, anon, authenticated;
revoke execute on function public.set_status_expiry() from public, anon, authenticated;
revoke execute on function public.set_spot_photo_expiry() from public, anon, authenticated;
revoke execute on function public.set_spot_expiry() from public, anon, authenticated;

alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

create or replace function public.meetup_interest_count(p_meetup_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from meetup_interests i
  join meetups m on m.id = i.meetup_id
  where i.meetup_id = p_meetup_id
    and auth.uid() is not null
    and (m.creator_id = auth.uid() or is_friend(auth.uid(), m.creator_id));
$$;

create or replace function public.meetup_here_now_count(p_meetup_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from meetup_checkins c
  join meetups m on m.id = c.meetup_id
  where c.meetup_id = p_meetup_id
    and c.checked_in_at > now() - interval '30 minutes'
    and auth.uid() is not null
    and (m.creator_id = auth.uid() or is_friend(auth.uid(), m.creator_id));
$$;

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

  select * into m from meetups
  where id = p_meetup_id
    and (creator_id = caller or is_friend(caller, creator_id));
  if m.id is null then
    raise exception 'Träffen hittades inte.';
  end if;

  if now() < m.starts_at - interval '1 hour' or now() > m.starts_at + interval '12 hours' then
    return false;
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
