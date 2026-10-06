create or replace function public.prepare_account_deletion(p_user_id uuid)
returns table (bucket text, path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  doomed uuid[];
  surviving_groups uuid[];
  group_id uuid;
begin
  select coalesce(array_agg(c.id), '{}') into doomed
  from conversations c
  join conversation_members cm on cm.conversation_id = c.id and cm.user_id = p_user_id
  where not c.is_group
     or not exists (
       select 1 from conversation_members other
       where other.conversation_id = c.id and other.user_id <> p_user_id
     );

  select coalesce(array_agg(c.id), '{}') into surviving_groups
  from conversations c
  join conversation_members cm on cm.conversation_id = c.id and cm.user_id = p_user_id
  where c.is_group and c.id <> all (doomed);

  return query
  select distinct o.bucket_id::text, o.name::text
  from storage.objects o
  where (
      o.bucket_id in ('chat-images', 'group-avatars')
      and (storage.foldername(o.name))[1] in (select unnest(doomed)::text)
    )
    or (
      o.owner_id = p_user_id::text
      and not (
        o.bucket_id = 'group-avatars'
        and (storage.foldername(o.name))[1] in (select unnest(surviving_groups)::text)
      )
    );

  delete from conversations where id = any (doomed);

  delete from conversation_members
  where user_id = p_user_id and conversation_id = any (surviving_groups);

  foreach group_id in array surviving_groups loop
    if not exists (
      select 1 from conversation_members
      where conversation_id = group_id and role = 'admin'
    ) then
      update conversation_members
      set role = 'admin'
      where conversation_id = group_id
        and user_id = (
          select user_id from conversation_members
          where conversation_id = group_id
          order by joined_at, user_id
          limit 1
        );
    end if;
  end loop;
end;
$$;

revoke execute on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
