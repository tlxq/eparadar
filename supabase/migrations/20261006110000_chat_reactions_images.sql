create table message_reactions (
  message_id uuid not null references messages on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  emoji text not null check (emoji in ('❤️', '😂', '😮', '😢', '🔥', '👍')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table message_reactions enable row level security;

create policy "members can view reactions in their conversations"
  on message_reactions for select
  using (
    exists (
      select 1 from messages m
      where m.id = message_reactions.message_id
        and is_conversation_member(m.conversation_id, auth.uid())
    )
  );

create or replace function public.toggle_reaction(p_message_id uuid, p_emoji text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target_conversation uuid;
  current_emoji text;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select conversation_id into target_conversation from messages where id = p_message_id;
  if target_conversation is null or not is_conversation_member(target_conversation, caller) then
    raise exception 'Meddelandet finns inte.';
  end if;

  select emoji into current_emoji from message_reactions
  where message_id = p_message_id and user_id = caller;

  if current_emoji = p_emoji then
    delete from message_reactions where message_id = p_message_id and user_id = caller;
    return null;
  end if;

  insert into message_reactions (message_id, user_id, emoji)
  values (p_message_id, caller, p_emoji)
  on conflict (message_id, user_id) do update set emoji = excluded.emoji, created_at = now();

  return p_emoji;
end;
$$;

grant execute on function public.toggle_reaction(uuid, text) to authenticated;

alter publication supabase_realtime add table message_reactions;

alter table messages add column image_path text;

alter table messages add constraint messages_body_or_image
  check (btrim(body) <> '' or image_path is not null) not valid;

alter table messages add constraint messages_image_path_in_conversation
  check (image_path is null or split_part(image_path, '/', 1) = conversation_id::text);

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', false)
on conflict (id) do nothing;

create policy "members read their conversations' chat images"
  on storage.objects for select
  using (
    bucket_id = 'chat-images'
    and is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "members upload chat images to their conversations"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "uploaders delete their own chat images"
  on storage.objects for delete
  using (bucket_id = 'chat-images' and owner_id = auth.uid()::text);
