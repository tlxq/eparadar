create table conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  name text,
  created_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations on delete cascade,
  sender_id uuid not null references profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index conversation_members_user_id_idx on conversation_members (user_id);
create index messages_conversation_id_created_at_idx on messages (conversation_id, created_at);

alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;

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
  );
$$;

grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

create policy "members can view their conversations"
  on conversations for select
  using (is_conversation_member(id, auth.uid()));

create policy "members can view conversation members"
  on conversation_members for select
  using (is_conversation_member(conversation_id, auth.uid()));

create policy "members can view messages"
  on messages for select
  using (is_conversation_member(conversation_id, auth.uid()));

create policy "members can send messages"
  on messages for insert
  with check (sender_id = auth.uid() and is_conversation_member(conversation_id, auth.uid()));

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
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  member_ids := array(select distinct unnest(array_append(other_user_ids, caller)));

  if array_length(member_ids, 1) < 2 then
    raise exception 'A conversation needs at least 2 members';
  end if;

  if array_length(member_ids, 1) = 2 then
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
  values (array_length(member_ids, 1) > 2, group_name)
  returning id into new_id;

  insert into conversation_members (conversation_id, user_id)
  select new_id, unnest(member_ids);

  return new_id;
end;
$$;

grant execute on function public.create_conversation(uuid[], text) to authenticated;

alter publication supabase_realtime add table messages;
