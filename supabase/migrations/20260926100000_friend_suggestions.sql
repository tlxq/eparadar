alter table friendships add column blocked_by uuid references profiles on delete cascade;

alter table friendships drop constraint friendships_status_check;
alter table friendships add constraint friendships_status_check
  check (status in ('pending', 'accepted', 'blocked'));

drop policy "participants view their friendships" on friendships;

create policy "participants view their friendships"
  on friendships for select
  using (
    (auth.uid() = requester_id or auth.uid() = addressee_id)
    and (status <> 'blocked' or auth.uid() = blocked_by)
  );

drop policy "participants remove their friendships" on friendships;

create policy "participants remove their non-blocked friendships"
  on friendships for delete
  using ((auth.uid() = requester_id or auth.uid() = addressee_id) and status <> 'blocked');

create index friendships_addressee_id_idx on friendships (addressee_id);

create or replace function public.has_any_friendship_row(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from friendships f
    where f.user_a = least(a, b) and f.user_b = greatest(a, b)
  );
$$;

grant execute on function public.has_any_friendship_row(uuid, uuid) to authenticated;

create or replace function public.block_user(target_user_id uuid)
returns friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  existing friendships;
  result friendships;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if target_user_id = caller then
    raise exception 'Du kan inte blockera dig själv.';
  end if;

  select * into existing from friendships
  where user_a = least(caller, target_user_id) and user_b = greatest(caller, target_user_id);

  if existing.id is not null then
    update friendships
    set status = 'blocked', blocked_by = caller, responded_at = now()
    where id = existing.id
    returning * into result;
    return result;
  end if;

  insert into friendships (requester_id, addressee_id, status, blocked_by)
  values (caller, target_user_id, 'blocked', caller)
  returning * into result;
  return result;
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;

create or replace function public.unblock_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  existing friendships;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into existing from friendships
  where user_a = least(caller, target_user_id) and user_b = greatest(caller, target_user_id);

  if existing.id is null or existing.status <> 'blocked' or existing.blocked_by <> caller then
    raise exception 'Blockeringen hittades inte.';
  end if;

  delete from friendships where id = existing.id;
end;
$$;

grant execute on function public.unblock_user(uuid) to authenticated;

create or replace function public.send_friend_request(target_user_id uuid)
returns friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  existing friendships;
  result friendships;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if target_user_id = caller then
    raise exception 'Du kan inte lägga till dig själv som vän.';
  end if;

  select * into existing from friendships
  where user_a = least(caller, target_user_id) and user_b = greatest(caller, target_user_id);

  if existing.id is not null then
    if existing.status = 'accepted' then
      raise exception 'Ni är redan vänner.';
    elsif existing.status = 'blocked' then
      raise exception 'Du kan inte skicka en vänförfrågan just nu.';
    elsif existing.requester_id = caller then
      raise exception 'Vänförfrågan är redan skickad.';
    else
      update friendships set status = 'accepted', responded_at = now()
      where id = existing.id
      returning * into result;
      return result;
    end if;
  end if;

  begin
    insert into friendships (requester_id, addressee_id)
    values (caller, target_user_id)
    returning * into result;
    return result;
  exception when unique_violation then
    update friendships set status = 'accepted', responded_at = now()
    where user_a = least(caller, target_user_id) and user_b = greatest(caller, target_user_id)
      and status = 'pending' and requester_id <> caller
    returning * into result;
    if result.id is null then
      raise exception 'Du kan inte skicka en vänförfrågan just nu.';
    end if;
    return result;
  end;
end;
$$;

create or replace function public.suggested_friends_from_meetups()
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  shared_meetup_count integer,
  last_meetup_id uuid,
  last_meetup_title text,
  last_checked_in_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  with my_meetups as (
    select meetup_id from meetup_checkins where user_id = auth.uid()
  ),
  co_attendees as (
    select mc.user_id, mc.meetup_id, mc.checked_in_at
    from meetup_checkins mc
    join my_meetups mm on mm.meetup_id = mc.meetup_id
    where mc.user_id <> auth.uid()
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    count(distinct ca.meetup_id)::int,
    (array_agg(ca.meetup_id order by ca.checked_in_at desc))[1],
    (array_agg(m.title order by ca.checked_in_at desc))[1],
    max(ca.checked_in_at)
  from co_attendees ca
  join profiles p on p.id = ca.user_id
  join meetups m on m.id = ca.meetup_id
  where not public.has_any_friendship_row(auth.uid(), ca.user_id)
  group by p.id, p.username, p.display_name, p.avatar_url
  order by max(ca.checked_in_at) desc
  limit 30;
$$;

grant execute on function public.suggested_friends_from_meetups() to authenticated;

create or replace function public.suggested_friends_mutual(p_limit integer default 30)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  mutual_friend_count integer
)
language sql
security definer
stable
set search_path = public
as $$
  with my_friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as friend_id
    from friendships
    where status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid())
  ),
  friends_of_friends as (
    select case when f.requester_id = mf.friend_id then f.addressee_id else f.requester_id end as candidate_id
    from friendships f
    join my_friends mf on mf.friend_id in (f.requester_id, f.addressee_id)
    where f.status = 'accepted'
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    count(*)::int
  from friends_of_friends fof
  join profiles p on p.id = fof.candidate_id
  where fof.candidate_id <> auth.uid()
    and fof.candidate_id not in (select friend_id from my_friends)
    and not public.has_any_friendship_row(auth.uid(), fof.candidate_id)
  group by p.id, p.username, p.display_name, p.avatar_url
  order by count(*) desc
  limit p_limit;
$$;

grant execute on function public.suggested_friends_mutual(integer) to authenticated;
