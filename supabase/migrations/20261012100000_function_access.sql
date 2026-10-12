create or replace function public.is_friend(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and auth.uid() in (a, b)
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

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
      and auth.uid() in (a, b)
  );
$$;

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
      and auth.uid() in (a, b)
  );
$$;

create or replace function public.is_conversation_member(conversation_id uuid, user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from conversation_members cm
    where cm.conversation_id = is_conversation_member.conversation_id
      and cm.user_id = is_conversation_member.user_id
      and cm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_member(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from conversation_members cm
    join conversations c on c.id = cm.conversation_id
    where cm.conversation_id = p_conversation_id
      and cm.user_id = p_user_id
      and cm.user_id = auth.uid()
      and c.is_group
  );
$$;

create or replace function public.is_blocked_direct_chat(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from conversations c
    join conversation_members other
      on other.conversation_id = c.id and other.user_id <> p_user_id
    join friendships f
      on f.user_a = least(p_user_id, other.user_id)
     and f.user_b = greatest(p_user_id, other.user_id)
    where c.id = p_conversation_id
      and p_user_id = auth.uid()
      and not c.is_group
      and f.status = 'blocked'
  );
$$;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon', f.signature);
  end loop;
end;
$$;

revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.trigger_send_push() from authenticated;
revoke execute on function public.record_heat_point() from authenticated;
