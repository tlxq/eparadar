alter table conversations add column avatar_path text;

alter table conversations add constraint conversations_avatar_path_in_group
  check (avatar_path is null or (is_group and split_part(avatar_path, '/', 1) = id::text));

insert into storage.buckets (id, name, public)
values ('group-avatars', 'group-avatars', false)
on conflict (id) do nothing;

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
      and c.is_group
  );
$$;

create policy "members read their groups' avatars"
  on storage.objects for select
  using (
    bucket_id = 'group-avatars'
    and is_group_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "members upload avatars to their groups"
  on storage.objects for insert
  with check (
    bucket_id = 'group-avatars'
    and is_group_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "members delete their groups' avatars"
  on storage.objects for delete
  using (
    bucket_id = 'group-avatars'
    and is_group_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create or replace function public.set_group_avatar(p_conversation_id uuid, p_path text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  previous text;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if not is_group_member(p_conversation_id, caller) then
    raise exception 'Du är inte med i den här gruppen.';
  end if;
  if p_path is not null and not exists (
    select 1 from storage.objects
    where bucket_id = 'group-avatars'
      and name = p_path
      and (storage.foldername(name))[1] = p_conversation_id::text
  ) then
    raise exception 'Bilden hittades inte.';
  end if;

  select avatar_path into previous from conversations where id = p_conversation_id for update;

  update conversations set avatar_path = p_path where id = p_conversation_id;

  return previous;
end;
$$;

grant execute on function public.set_group_avatar(uuid, text) to authenticated;
