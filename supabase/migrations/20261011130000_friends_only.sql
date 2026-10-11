create or replace function public.create_conversation(other_user_ids uuid[], group_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  member_ids uuid[];
  existing_id uuid;
  new_id uuid;
  is_group_chat boolean;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  member_ids := array(select distinct unnest(array_append(other_user_ids, caller)));

  if array_length(member_ids, 1) < 2 then
    raise exception 'A conversation needs at least 2 members';
  end if;

  if exists (
    select 1 from unnest(member_ids) as member_id
    where member_id <> caller and not public.is_friend(caller, member_id)
  ) then
    raise exception 'Du kan bara chatta med dina vänner.';
  end if;

  is_group_chat := array_length(member_ids, 1) > 2;

  if not is_group_chat then
    select cm1.conversation_id into existing_id
    from conversation_members cm1
    join conversation_members cm2 on cm2.conversation_id = cm1.conversation_id
    join conversations c on c.id = cm1.conversation_id
    where c.is_group = false
      and cm1.user_id = member_ids[1]
      and cm2.user_id = member_ids[2]
    limit 1;

    if existing_id is not null then
      return existing_id;
    end if;
  end if;

  insert into conversations (is_group, name)
  values (is_group_chat, group_name)
  returning id into new_id;

  insert into conversation_members (conversation_id, user_id, role)
  select new_id, member_id, case when is_group_chat and member_id = caller then 'admin' else 'member' end
  from unnest(member_ids) as member_id;

  return new_id;
end;
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
      and not c.is_group
      and f.status = 'blocked'
  );
$$;

grant execute on function public.is_blocked_direct_chat(uuid, uuid) to authenticated;

drop policy "members can send messages" on messages;

create policy "members can send messages"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and is_conversation_member(conversation_id, auth.uid())
    and not is_blocked_direct_chat(conversation_id, auth.uid())
  );

drop policy "posts are readable by everyone" on posts;

create policy "authors and friends read posts"
  on posts for select
  using (auth.uid() = author_id or is_friend(auth.uid(), author_id));

create index if not exists posts_created_at_idx on posts (created_at desc);
