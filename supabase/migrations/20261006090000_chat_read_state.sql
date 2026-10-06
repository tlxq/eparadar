alter table conversation_members add column last_read_at timestamptz;

update conversation_members set last_read_at = now();

alter table conversation_members alter column last_read_at set default now();

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  result timestamptz;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  update conversation_members
  set last_read_at = greatest(coalesce(last_read_at, '-infinity'::timestamptz), now())
  where conversation_id = p_conversation_id and user_id = caller
  returning last_read_at into result;

  if result is null then
    raise exception 'Du är inte med i den här chatten.';
  end if;

  return result;
end;
$$;

grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.unsend_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target messages;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into target from messages where id = p_message_id;

  if target.id is null or target.sender_id <> caller then
    raise exception 'Du kan bara ta bort dina egna meddelanden.';
  end if;

  if exists (
    select 1 from conversation_members cm
    where cm.conversation_id = target.conversation_id
      and cm.user_id <> caller
      and cm.last_read_at >= target.created_at
  ) then
    raise exception 'Meddelandet är redan läst och kan inte tas bort.';
  end if;

  delete from messages where id = target.id;
end;
$$;

grant execute on function public.unsend_message(uuid) to authenticated;

alter publication supabase_realtime add table conversation_members;
