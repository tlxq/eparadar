create table conversation_mutes (
  conversation_id uuid not null,
  user_id uuid not null,
  muted_until timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id),
  foreign key (conversation_id, user_id)
    references conversation_members (conversation_id, user_id) on delete cascade
);

alter table conversation_mutes enable row level security;

create policy "members read their own mutes"
  on conversation_mutes for select to authenticated
  using (user_id = auth.uid());

create or replace function public.set_conversation_mute(p_conversation_id uuid, p_until timestamptz)
returns timestamptz
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
  if not is_conversation_member(p_conversation_id, caller) then
    raise exception 'Du är inte med i den här chatten.';
  end if;

  if p_until is null then
    delete from conversation_mutes
    where conversation_id = p_conversation_id and user_id = caller;
    return null;
  end if;

  if p_until <= now() then
    raise exception 'Tiden måste vara framåt.';
  end if;

  insert into conversation_mutes (conversation_id, user_id, muted_until)
  values (p_conversation_id, caller, p_until)
  on conflict (conversation_id, user_id) do update set muted_until = excluded.muted_until;

  return p_until;
end;
$$;

revoke execute on function public.set_conversation_mute(uuid, timestamptz) from public, anon;
grant execute on function public.set_conversation_mute(uuid, timestamptz) to authenticated;

create or replace function public.purge_expired_mutes()
returns void
language sql
security definer
set search_path = public
as $$
  delete from conversation_mutes where muted_until <= now();
$$;

revoke execute on function public.purge_expired_mutes() from public, anon, authenticated;

select cron.schedule('purge-expired-mutes', '17 * * * *', 'select public.purge_expired_mutes()');

alter table conversation_members add column added_at timestamptz;

create or replace function public.can_see_message(p_conversation_id uuid, p_created_at timestamptz)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
      and (cm.added_at is null or cm.added_at <= p_created_at)
  );
$$;

revoke execute on function public.can_see_message(uuid, timestamptz) from public, anon;
grant execute on function public.can_see_message(uuid, timestamptz) to authenticated;

drop policy "members can view messages" on messages;

create policy "members can view messages"
  on messages for select to authenticated
  using (can_see_message(conversation_id, created_at));

create or replace function public.add_conversation_members(p_conversation_id uuid, p_user_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  new_ids uuid[];
  added integer;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if not is_group_member(p_conversation_id, caller) then
    raise exception 'Du är inte med i den här gruppen.';
  end if;

  new_ids := array(
    select distinct n.uid from unnest(coalesce(p_user_ids, '{}'::uuid[])) as n(uid)
    where n.uid is not null
      and n.uid <> caller
      and not exists (
        select 1 from conversation_members cm
        where cm.conversation_id = p_conversation_id and cm.user_id = n.uid
      )
  );

  if coalesce(array_length(new_ids, 1), 0) = 0 then
    raise exception 'Välj minst en kompis som inte redan är med.';
  end if;

  if exists (select 1 from unnest(new_ids) as n(uid) where not is_friend(caller, n.uid)) then
    raise exception 'Du kan bara lägga till dina kompisar.';
  end if;

  if exists (
    select 1
    from unnest(new_ids) as n(uid)
    join conversation_members cm on cm.conversation_id = p_conversation_id
    join friendships f
      on f.user_a = least(n.uid, cm.user_id) and f.user_b = greatest(n.uid, cm.user_id)
    where f.status = 'blocked'
  ) then
    raise exception 'Någon av dem du valde kan inte läggas till i gruppen.';
  end if;

  insert into conversation_members (conversation_id, user_id, role, added_at, last_read_at)
  select p_conversation_id, n.uid, 'member', now(), now()
  from unnest(new_ids) as n(uid);

  get diagnostics added = row_count;
  return added;
end;
$$;

revoke execute on function public.add_conversation_members(uuid, uuid[]) from public, anon;
grant execute on function public.add_conversation_members(uuid, uuid[]) to authenticated;

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
      and (cm.added_at is null or cm.added_at <= target.created_at)
      and cm.last_read_at >= target.created_at
  ) then
    raise exception 'Meddelandet är redan läst och kan inte tas bort.';
  end if;

  delete from messages where id = target.id;
end;
$$;

revoke execute on function public.unsend_message(uuid) from public, anon;
grant execute on function public.unsend_message(uuid) to authenticated;

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from profiles p where p.id = me),
    'birth_year', (select a.birth_year from user_ages a where a.user_id = me),
    'cars', coalesce((select jsonb_agg(to_jsonb(c)) from cars c where c.owner_id = me), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(to_jsonb(p)) from posts p where p.author_id = me), '[]'::jsonb),
    'post_places', coalesce((select jsonb_agg(to_jsonb(pp)) from post_places pp where pp.author_id = me), '[]'::jsonb),
    'post_reactions', coalesce((select jsonb_agg(to_jsonb(r)) from post_reactions r where r.user_id = me), '[]'::jsonb),
    'likes', coalesce((select jsonb_agg(to_jsonb(l)) from likes l where l.user_id = me), '[]'::jsonb),
    'friendships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'with_user_id', case when f.requester_id = me then f.addressee_id else f.requester_id end,
        'status', f.status,
        'created_at', f.created_at
      ))
      from friendships f where me in (f.requester_id, f.addressee_id)
    ), '[]'::jsonb),
    'conversations', coalesce((
      select jsonb_agg(to_jsonb(cm)) from conversation_members cm where cm.user_id = me
    ), '[]'::jsonb),
    'conversation_mutes', coalesce((
      select jsonb_agg(jsonb_build_object('conversation_id', m.conversation_id, 'muted_until', m.muted_until))
      from conversation_mutes m where m.user_id = me
    ), '[]'::jsonb),
    'messages_sent', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at) from messages m where m.sender_id = me
    ), '[]'::jsonb),
    'location', (select to_jsonb(l) from locations l where l.user_id = me),
    'spots', coalesce((select jsonb_agg(to_jsonb(s)) from spots s where s.creator_id = me), '[]'::jsonb),
    'spot_photos', coalesce((select jsonb_agg(to_jsonb(s)) from spot_photos s where s.author_id = me), '[]'::jsonb),
    'warning_votes', coalesce((select jsonb_agg(to_jsonb(v)) from spot_votes v where v.user_id = me), '[]'::jsonb),
    'meetups', coalesce((select jsonb_agg(to_jsonb(m)) from meetups m where m.creator_id = me), '[]'::jsonb),
    'meetup_interests', coalesce((select jsonb_agg(to_jsonb(i)) from meetup_interests i where i.user_id = me), '[]'::jsonb),
    'meetup_checkins', coalesce((select jsonb_agg(to_jsonb(c)) from meetup_checkins c where c.user_id = me), '[]'::jsonb),
    'reports_filed', coalesce((
      select jsonb_agg(jsonb_build_object('target_type', r.target_type, 'reason', r.reason, 'details', r.details, 'created_at', r.created_at))
      from reports r where r.reporter_id = me
    ), '[]'::jsonb),
    'push_devices', coalesce((
      select jsonb_agg(jsonb_build_object('platform', t.platform, 'created_at', t.created_at))
      from push_tokens t where t.user_id = me
    ), '[]'::jsonb),
    'app_events', coalesce((
      select jsonb_agg(jsonb_build_object('event', e.event_name, 'at', e.created_at))
      from analytics_events e where e.user_id = me
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
