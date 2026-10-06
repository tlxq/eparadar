alter table conversation_members
  add column role text not null default 'member' check (role in ('admin', 'member'));

update conversation_members cm
set role = 'admin'
from conversations c
where c.id = cm.conversation_id and c.is_group;

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

create or replace function public.rename_conversation(p_conversation_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  trimmed text := btrim(coalesce(p_name, ''));
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if not is_conversation_member(p_conversation_id, caller) then
    raise exception 'Du är inte med i den här chatten.';
  end if;
  if not exists (select 1 from conversations where id = p_conversation_id and is_group) then
    raise exception 'Bara gruppchattar kan döpas om.';
  end if;
  if length(trimmed) not between 1 and 40 then
    raise exception 'Gruppnamnet måste vara 1–40 tecken.';
  end if;

  update conversations set name = trimmed where id = p_conversation_id;
end;
$$;

grant execute on function public.rename_conversation(uuid, text) to authenticated;

create or replace function public.leave_conversation(p_conversation_id uuid)
returns void
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
  if not exists (select 1 from conversations where id = p_conversation_id and is_group) then
    raise exception 'Du kan bara lämna gruppchattar.';
  end if;

  delete from conversation_members
  where conversation_id = p_conversation_id and user_id = caller;

  if not found then
    raise exception 'Du är inte med i den här chatten.';
  end if;

  if not exists (select 1 from conversation_members where conversation_id = p_conversation_id) then
    delete from conversations where id = p_conversation_id;
    return;
  end if;

  if not exists (
    select 1 from conversation_members
    where conversation_id = p_conversation_id and role = 'admin'
  ) then
    update conversation_members
    set role = 'admin'
    where conversation_id = p_conversation_id
      and user_id = (
        select user_id from conversation_members
        where conversation_id = p_conversation_id
        order by joined_at, user_id
        limit 1
      );
  end if;
end;
$$;

grant execute on function public.leave_conversation(uuid) to authenticated;

create or replace function public.remove_member(p_conversation_id uuid, p_user_id uuid)
returns void
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
  if not exists (
    select 1 from conversation_members
    where conversation_id = p_conversation_id and user_id = caller and role = 'admin'
  ) then
    raise exception 'Bara admin kan ta bort medlemmar.';
  end if;
  if p_user_id = caller then
    raise exception 'Använd Lämna gruppen för att gå ur själv.';
  end if;

  delete from conversation_members
  where conversation_id = p_conversation_id and user_id = p_user_id;

  if not found then
    raise exception 'Personen är inte med i gruppen.';
  end if;
end;
$$;

grant execute on function public.remove_member(uuid, uuid) to authenticated;

alter publication supabase_realtime add table conversations;
