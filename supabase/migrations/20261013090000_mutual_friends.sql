create or replace function public.mutual_friends(p_user_id uuid)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Du måste vara inloggad.';
  end if;

  if p_user_id = me or not public.is_friend(me, p_user_id) then
    return;
  end if;

  return query
  with mine as (
    select case when f.requester_id = me then f.addressee_id else f.requester_id end as friend_id
    from friendships f
    where f.status = 'accepted' and me in (f.requester_id, f.addressee_id)
  ),
  theirs as (
    select case when f.requester_id = p_user_id then f.addressee_id else f.requester_id end as friend_id
    from friendships f
    where f.status = 'accepted' and p_user_id in (f.requester_id, f.addressee_id)
  )
  select p.id, p.username, p.display_name, p.avatar_url
  from mine
  join theirs on theirs.friend_id = mine.friend_id
  join profiles p on p.id = mine.friend_id
  order by p.display_name;
end;
$$;

revoke execute on function public.mutual_friends(uuid) from public, anon;
grant execute on function public.mutual_friends(uuid) to authenticated;
