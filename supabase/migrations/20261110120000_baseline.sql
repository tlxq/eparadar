create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;

SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;

CREATE FUNCTION public.add_conversation_members(p_conversation_id uuid, p_user_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.admin_mark_report_handled(p_report_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Bara för admin.' using errcode = '42501';
  end if;

  update reports set status = 'handled' where id = p_report_id;
  if not found then
    raise exception 'Hittade inte rapporten.';
  end if;
end;
$$;

CREATE FUNCTION public.admin_open_reports() RETURNS TABLE(id uuid, target_type text, target_id uuid, reason text, details text, snapshot text, created_at timestamp with time zone, reported_user_id uuid, reported_username text, reported_display_name text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Bara för admin.' using errcode = '42501';
  end if;

  return query
    select r.id, r.target_type, r.target_id, r.reason, r.details, r.snapshot, r.created_at,
      r.reported_user_id, p.username, p.display_name
    from reports r
    left join profiles p on p.id = r.reported_user_id
    where r.status = 'open'
    order by r.created_at desc
    limit 200;
end;
$$;

CREATE FUNCTION public.admin_remove_reported_content(p_report_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  report reports%rowtype;
  file_path text;
  removed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Bara för admin.' using errcode = '42501';
  end if;

  select * into report from reports where id = p_report_id;
  if not found then
    raise exception 'Hittade inte rapporten.';
  end if;

  if report.target_type = 'post' then
    delete from posts where id = report.target_id returning image_url into file_path;
    removed := found;
    if file_path is not null then
      insert into storage_cleanup (bucket, path) values ('post-images', file_path) on conflict do nothing;
    end if;
  elsif report.target_type = 'message' then
    delete from messages where id = report.target_id returning image_path into file_path;
    removed := found;
    if file_path is not null then
      insert into storage_cleanup (bucket, path) values ('chat-images', file_path) on conflict do nothing;
    end if;
  elsif report.target_type = 'spot' then
    delete from spots where id = report.target_id;
    removed := found;
  elsif report.target_type = 'spot_photo' then
    delete from spot_photos where id = report.target_id;
    removed := found;
  elsif report.target_type = 'meetup' then
    delete from meetups where id = report.target_id;
    removed := found;
  elsif report.target_type = 'status' then
    update locations set status_text = null
    where user_id = report.target_id
      and status_text is not null
      and 'Status: ' || status_text = report.snapshot;
    removed := found;
  elsif report.target_type = 'conversation' then
    select avatar_path into file_path from conversations where id = report.target_id and is_group;
    update conversations set name = null, avatar_path = null
    where id = report.target_id and is_group;
    removed := found;
    if file_path is not null then
      insert into storage_cleanup (bucket, path) values ('group-avatars', file_path) on conflict do nothing;
    end if;
  else
    raise exception 'Den här typen går inte att ta bort härifrån.';
  end if;

  update reports set status = 'handled'
  where status = 'open'
    and target_type = report.target_type
    and target_id = report.target_id
    and (report.target_type not in ('status', 'conversation') or snapshot is not distinct from report.snapshot);

  return removed;
end;
$$;

CREATE TABLE public.friendships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid NOT NULL,
    addressee_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    user_a uuid GENERATED ALWAYS AS (LEAST(requester_id, addressee_id)) STORED,
    user_b uuid GENERATED ALWAYS AS (GREATEST(requester_id, addressee_id)) STORED,
    blocked_by uuid,
    CONSTRAINT friendships_check CHECK ((requester_id <> addressee_id)),
    CONSTRAINT friendships_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'blocked'::text])))
);

ALTER TABLE ONLY public.friendships REPLICA IDENTITY FULL;

CREATE FUNCTION public.block_user(target_user_id uuid) RETURNS public.friendships
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  existing friendships;
  result friendships;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if target_user_id = caller then
    raise exception 'Du kan inte blockera dig själv.';
  end if;

  select * into existing from friendships
  where user_a = least(caller, target_user_id) and user_b = greatest(caller, target_user_id);

  if existing.id is not null then
    update friendships
    set status = 'blocked', blocked_by = caller, responded_at = now()
    where id = existing.id
    returning * into result;
    return result;
  end if;

  insert into friendships (requester_id, addressee_id, status, blocked_by)
  values (caller, target_user_id, 'blocked', caller)
  returning * into result;
  return result;
end;
$$;

CREATE FUNCTION public.can_see_message(p_conversation_id uuid, p_created_at timestamp with time zone) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = auth.uid()
      and (cm.added_at is null or cm.added_at <= p_created_at)
  );
$$;

CREATE FUNCTION public.check_in_at_meetup(p_meetup_id uuid, p_lat double precision, p_lng double precision) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  m meetups;
  distance_m double precision;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into m from meetups
  where id = p_meetup_id
    and (creator_id = caller or is_friend(caller, creator_id));
  if m.id is null then
    raise exception 'Träffen hittades inte.';
  end if;

  if now() < m.starts_at - interval '1 hour' or now() > m.starts_at + interval '12 hours' then
    return false;
  end if;

  distance_m := 6371000 * acos(
    least(1, greatest(-1,
      cos(radians(p_lat)) * cos(radians(m.lat)) * cos(radians(m.lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(m.lat))
    ))
  );

  if distance_m <= 150 then
    insert into meetup_checkins (meetup_id, user_id, checked_in_at)
    values (p_meetup_id, caller, now())
    on conflict (meetup_id, user_id) do update set checked_in_at = now();
    return true;
  end if;

  return false;
end;
$$;

CREATE FUNCTION public.check_minimum_age() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.birth_year > extract(year from now())::int - 15 then
    raise exception 'Du måste vara minst 15 år för att använda epaRadar.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

CREATE FUNCTION public.create_conversation(other_user_ids uuid[], group_name text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE TABLE public.friend_codes (
    user_id uuid NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT friend_codes_code_check CHECK ((code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'::text))
);

CREATE FUNCTION public.current_friend_code(rotate boolean DEFAULT false) RETURNS public.friend_codes
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  result friend_codes;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if not rotate then
    select * into result from friend_codes
    where user_id = caller and expires_at > now() + interval '30 seconds';
    if result.user_id is not null then
      return result;
    end if;
  end if;

  for attempt in 1..5 loop
    begin
      insert into friend_codes (user_id, code, expires_at)
      values (caller, public.generate_friend_code(), now() + interval '10 minutes')
      on conflict (user_id) do update
        set code = excluded.code, expires_at = excluded.expires_at
      returning * into result;
      return result;
    exception when unique_violation then
      if attempt = 5 then
        raise;
      end if;
    end;
  end loop;

  return result;
end;
$$;

CREATE FUNCTION public.evening_heat() RETURNS TABLE(lat double precision, lng double precision, people integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select h.cell_lat, h.cell_lng, count(distinct h.user_id)::int
  from heat_points h
  where h.seen_at > now() - interval '6 hours'
    and h.user_id <> auth.uid()
    and is_friend(auth.uid(), h.user_id)
  group by h.cell_lat, h.cell_lng
  having count(distinct h.user_id) >= 2;
$$;

CREATE FUNCTION public.export_my_data() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.fuzz_location_before_write() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.approximate_enabled then
    new.lat := round(new.lat / 0.003) * 0.003;
    new.lng := round(new.lng / 0.003) * 0.003;
    new.heading := null;
    new.moving := false;
  end if;
  return new;
end;
$$;

CREATE FUNCTION public.generate_friend_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  result text := '';
begin
  for i in 0..5 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
declare
  birth_year_text text := new.raw_user_meta_data->>'birth_year';
begin
  if new.raw_user_meta_data ? 'username' and coalesce(birth_year_text, '') !~ '^\d{4}$' then
    raise exception 'Fyll i ditt födelseår.';
  end if;

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Ny användare')
  );

  if birth_year_text ~ '^\d{4}$' then
    insert into public.user_ages (user_id, birth_year) values (new.id, birth_year_text::smallint);
  end if;

  return new;
end;
$_$;

CREATE FUNCTION public.has_any_friendship_row(a uuid, b uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from friendships f
    where f.user_a = least(a, b) and f.user_b = greatest(a, b)
      and auth.uid() in (a, b)
  );
$$;

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select auth.uid() is not null
    and exists (select 1 from admins where user_id = auth.uid());
$$;

CREATE FUNCTION public.is_blocked_between(a uuid, b uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from friendships f
    where f.user_a = least(a, b) and f.user_b = greatest(a, b) and f.status = 'blocked'
      and auth.uid() in (a, b)
  );
$$;

CREATE FUNCTION public.is_blocked_direct_chat(p_conversation_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.is_conversation_member(conversation_id uuid, user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from conversation_members cm
    where cm.conversation_id = is_conversation_member.conversation_id
      and cm.user_id = is_conversation_member.user_id
      and cm.user_id = auth.uid()
  );
$$;

CREATE FUNCTION public.is_friend(a uuid, b uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and auth.uid() in (a, b)
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

CREATE FUNCTION public.is_group_member(p_conversation_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.keep_meetup_identity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.id := old.id;
  new.creator_id := old.creator_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

CREATE FUNCTION public.leave_conversation(p_conversation_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.leave_nearby() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  delete from nearby_presence where user_id = auth.uid();
$$;

CREATE FUNCTION public.mark_conversation_read(p_conversation_id uuid) RETURNS timestamp with time zone
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.meetup_here_now_count(p_meetup_id uuid) RETURNS bigint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select count(*)
  from meetup_checkins c
  join meetups m on m.id = c.meetup_id
  where c.meetup_id = p_meetup_id
    and c.checked_in_at > now() - interval '30 minutes'
    and auth.uid() is not null
    and (m.creator_id = auth.uid() or is_friend(auth.uid(), m.creator_id));
$$;

CREATE FUNCTION public.meetup_interest_count(p_meetup_id uuid) RETURNS bigint
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select count(*)
  from meetup_interests i
  join meetups m on m.id = i.meetup_id
  where i.meetup_id = p_meetup_id
    and auth.uid() is not null
    and (m.creator_id = auth.uid() or is_friend(auth.uid(), m.creator_id));
$$;

CREATE FUNCTION public.mutual_friends(p_user_id uuid) RETURNS TABLE(id uuid, username text, display_name text, avatar_url text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.notify_report() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  secret_key text;
  function_url text;
begin
  select decrypted_secret into secret_key
  from vault.decrypted_secrets
  where name = 'edge_function_secret_key';

  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'notify_report_function_url';

  if secret_key is null or function_url is null then
    return null;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', secret_key),
    body := jsonb_build_object('report_id', new.id)
  );
  return null;
end;
$$;

CREATE FUNCTION public.prepare_account_deletion(p_user_id uuid) RETURNS TABLE(bucket text, path text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.purge_expired_map_data() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update locations
  set lat = null, lng = null, heading = null, moving = false
  where lat is not null and updated_at < now() - interval '12 hours';

  update locations
  set status_text = null
  where status_text is not null and status_expires_at < now();

  delete from nearby_presence where seen_at < now() - interval '2 minutes';
  delete from heat_points where seen_at < now() - interval '12 hours';
  delete from spot_photos where expires_at < now();
  delete from spots where expires_at < now();
  delete from meetup_checkins where checked_in_at < now() - interval '12 hours';
  delete from meetups where starts_at < now() - interval '1 day';
end;
$$;

CREATE FUNCTION public.purge_expired_mutes() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  delete from conversation_mutes where muted_until <= now();
$$;

CREATE FUNCTION public.purge_expired_post_places() RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  delete from post_places where expires_at < now();
$$;

CREATE FUNCTION public.queue_spot_photo_file() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into storage_cleanup (bucket, path)
  values ('spot-photos', old.path)
  on conflict do nothing;
  return null;
end;
$$;

CREATE FUNCTION public.record_heat_point() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if not new.sharing_enabled then
    delete from heat_points where user_id = new.user_id;
  elsif new.lat is not null and new.lng is not null then
    insert into heat_points (user_id, cell_lat, cell_lng, seen_at)
    values (new.user_id, round(new.lat / 0.003) * 0.003, round(new.lng / 0.003) * 0.003, now())
    on conflict (user_id, cell_lat, cell_lng) do update set seen_at = excluded.seen_at;
  end if;
  return null;
end;
$$;

CREATE FUNCTION public.redeem_friend_code(friend_code text) RETURNS TABLE(outcome text, user_id uuid, display_name text, avatar_url text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  normalized text := upper(regexp_replace(coalesce(friend_code, ''), '[^A-Za-z0-9]', '', 'g'));
  owner uuid;
  existing friendships;
  sent friendships;
  recent_attempts integer;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  delete from friend_code_attempts
  where friend_code_attempts.user_id = caller and attempted_at < now() - interval '1 hour';

  select count(*) into recent_attempts from friend_code_attempts
  where friend_code_attempts.user_id = caller and attempted_at > now() - interval '10 minutes';

  if recent_attempts >= 10 then
    raise exception 'För många försök. Vänta några minuter och prova igen.';
  end if;

  insert into friend_code_attempts (user_id) values (caller);

  select fc.user_id into owner from friend_codes fc
  where fc.code = normalized and fc.expires_at > now();

  if owner is null then
    outcome := 'invalid';
    return next;
    return;
  end if;

  if owner = caller then
    outcome := 'own_code';
    return next;
    return;
  end if;

  select * into existing from friendships
  where user_a = least(caller, owner) and user_b = greatest(caller, owner);

  if existing.id is not null and existing.status = 'blocked' then
    outcome := 'invalid';
    return next;
    return;
  end if;

  if existing.id is not null and existing.status = 'accepted' then
    outcome := 'already_friends';
  elsif existing.id is not null and existing.requester_id = caller then
    outcome := 'already_sent';
  else
    sent := public.send_friend_request(owner);
    outcome := case when sent.status = 'accepted' then 'accepted' else 'sent' end;
  end if;

  select p.id, p.display_name, p.avatar_url
  into user_id, display_name, avatar_url
  from profiles p where p.id = owner;

  return next;
end;
$$;

CREATE FUNCTION public.remove_member(p_conversation_id uuid, p_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.rename_conversation(p_conversation_id uuid, p_name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.report_content(p_target_type text, p_target_id uuid, p_reason text, p_details text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  target_user uuid;
  target_text text;
  target_found boolean := false;
  clean_details text := nullif(btrim(p_details), '');
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if p_reason = 'annat' and clean_details is null then
    raise exception 'Skriv kort vad det gäller.';
  end if;

  if p_target_type = 'post' then
    select author_id, coalesce(body, '') || coalesce(' [bild: ' || image_url || ']', '')
      into target_user, target_text from posts where id = p_target_id;
  elsif p_target_type = 'message' then
    select sender_id, btrim(body || coalesce(' [bild: ' || image_path || ']', ''))
      into target_user, target_text from messages where id = p_target_id;
  elsif p_target_type = 'profile' then
    select id, display_name || ' (@' || username || ')' || coalesce(' ' || bio, '')
      into target_user, target_text from profiles where id = p_target_id;
  elsif p_target_type = 'spot' then
    select creator_id, coalesce(name, warning_type) into target_user, target_text
      from spots where id = p_target_id;
  elsif p_target_type = 'spot_photo' then
    select author_id, '[bild: ' || path || ']' into target_user, target_text
      from spot_photos where id = p_target_id;
  elsif p_target_type = 'meetup' then
    select creator_id, title into target_user, target_text from meetups where id = p_target_id;
  elsif p_target_type = 'status' then
    select user_id, 'Status: ' || status_text into target_user, target_text
      from locations
      where user_id = p_target_id and status_text is not null and status_expires_at > now();
  elsif p_target_type = 'conversation' then
    select true, 'Grupp: ' || coalesce(name, '(inget namn)') || coalesce(' [bild: ' || avatar_path || ']', '')
      into target_found, target_text
      from conversations where id = p_target_id and is_group;
  else
    raise exception 'Okänd typ.';
  end if;

  if target_user is null and not coalesce(target_found, false) then
    raise exception 'Hittade inte det du vill rapportera.';
  end if;

  if target_user = caller then
    raise exception 'Du kan inte rapportera dig själv.';
  end if;

  if (
    select count(*) from reports
    where reporter_id = caller and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Du har rapporterat mycket på kort tid. Försök igen senare.';
  end if;

  target_text := left(target_text, 1000);

  insert into reports (reporter_id, reported_user_id, target_type, target_id, reason, details, snapshot)
  values (caller, target_user, p_target_type, p_target_id, p_reason, clean_details, target_text)
  on conflict (reporter_id, target_type, target_id, md5(coalesce(snapshot, ''))) do nothing;
end;
$$;

CREATE FUNCTION public.request_storage_cleanup() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  secret_key text;
  function_url text;
begin
  if not exists (select 1 from storage_cleanup) then
    return;
  end if;

  select decrypted_secret into secret_key
  from vault.decrypted_secrets
  where name = 'edge_function_secret_key';

  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'purge_storage_function_url';

  if secret_key is null or function_url is null then
    return;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', secret_key),
    body := '{}'::jsonb
  );
end;
$$;

CREATE FUNCTION public.respond_to_friend_request(request_id uuid, accept boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  target friendships;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into target from friendships
  where id = request_id and addressee_id = caller and status = 'pending';

  if target.id is null then
    raise exception 'Vänförfrågan hittades inte.';
  end if;

  if accept then
    update friendships set status = 'accepted', responded_at = now() where id = request_id;
  else
    delete from friendships where id = request_id;
  end if;
end;
$$;

CREATE FUNCTION public.scan_nearby(p_lat double precision, p_lng double precision) RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, request_state text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Ogiltig position.';
  end if;

  delete from nearby_presence np where np.seen_at < now() - interval '2 minutes';

  insert into nearby_presence (user_id, lat, lng, seen_at)
  values (caller, p_lat, p_lng, now())
  on conflict on constraint nearby_presence_pkey do update
    set lat = excluded.lat, lng = excluded.lng, seen_at = excluded.seen_at;

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    case
      when f.id is null then 'none'
      when f.requester_id = caller then 'sent'
      else 'received'
    end
  from nearby_presence np
  join profiles p on p.id = np.user_id
  left join friendships f
    on f.user_a = least(caller, np.user_id) and f.user_b = greatest(caller, np.user_id)
  where np.user_id <> caller
    and np.seen_at > now() - interval '20 seconds'
    and np.lat between p_lat - 0.002 and p_lat + 0.002
    and 6371000 * acos(least(1, greatest(-1,
      cos(radians(p_lat)) * cos(radians(np.lat)) * cos(radians(np.lng) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(np.lat))
    ))) <= 100
    and (f.id is null or f.status = 'pending')
  order by p.display_name
  limit 30;
end;
$$;

CREATE FUNCTION public.send_friend_request(target_user_id uuid) RETURNS public.friendships
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  existing friendships;
  result friendships;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if target_user_id = caller then
    raise exception 'Du kan inte lägga till dig själv som vän.';
  end if;

  select * into existing from friendships
  where user_a = least(caller, target_user_id) and user_b = greatest(caller, target_user_id);

  if existing.id is not null then
    if existing.status = 'accepted' then
      raise exception 'Ni är redan vänner.';
    elsif existing.status = 'blocked' then
      raise exception 'Du kan inte skicka en vänförfrågan just nu.';
    elsif existing.requester_id = caller then
      raise exception 'Vänförfrågan är redan skickad.';
    else
      update friendships set status = 'accepted', responded_at = now()
      where id = existing.id
      returning * into result;
      return result;
    end if;
  end if;

  begin
    insert into friendships (requester_id, addressee_id)
    values (caller, target_user_id)
    returning * into result;
    return result;
  exception when unique_violation then
    update friendships set status = 'accepted', responded_at = now()
    where user_a = least(caller, target_user_id) and user_b = greatest(caller, target_user_id)
      and status = 'pending' and requester_id <> caller
    returning * into result;
    if result.id is null then
      raise exception 'Du kan inte skicka en vänförfrågan just nu.';
    end if;
    return result;
  end;
end;
$$;

CREATE FUNCTION public.set_conversation_mute(p_conversation_id uuid, p_until timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.set_group_avatar(p_conversation_id uuid, p_path text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.set_post_place_expiry() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.created_at := now();
  new.expires_at := now() + interval '24 hours';
  if exists (
    select 1 from locations l where l.user_id = new.author_id and l.approximate_enabled
  ) then
    new.lat := round((new.lat / 0.003)::numeric) * 0.003;
    new.lng := round((new.lng / 0.003)::numeric) * 0.003;
  end if;
  return new;
end;
$$;

CREATE FUNCTION public.set_spot_expiry() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.created_at := now();
  new.visibility := 'friends';
  if new.kind = 'varning' then
    new.expires_at := new.created_at + interval '2 hours';
  else
    new.expires_at := new.created_at + interval '24 hours';
  end if;
  return new;
end;
$$;

CREATE FUNCTION public.set_spot_photo_expiry() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.created_at := now();
  new.expires_at := now() + interval '24 hours';
  return new;
end;
$$;

CREATE FUNCTION public.set_status_expiry() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if new.status_text is null then
    new.status_expires_at := null;
  elsif tg_op = 'INSERT'
    or new.status_text is distinct from old.status_text
    or new.status_expires_at is distinct from old.status_expires_at then
    new.status_text := btrim(new.status_text);
    new.status_expires_at := now() + interval '1 hour';
  end if;
  return new;
end;
$$;

CREATE FUNCTION public.suggested_friends_from_meetups() RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, shared_meetup_count integer, last_meetup_id uuid, last_meetup_title text, last_checked_in_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with my_meetups as (
    select meetup_id from meetup_checkins where user_id = auth.uid()
  ),
  co_attendees as (
    select mc.user_id, mc.meetup_id, mc.checked_in_at
    from meetup_checkins mc
    join my_meetups mm on mm.meetup_id = mc.meetup_id
    where mc.user_id <> auth.uid()
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    count(distinct ca.meetup_id)::int,
    (array_agg(ca.meetup_id order by ca.checked_in_at desc))[1],
    (array_agg(m.title order by ca.checked_in_at desc))[1],
    max(ca.checked_in_at)
  from co_attendees ca
  join profiles p on p.id = ca.user_id
  join meetups m on m.id = ca.meetup_id
  where not public.has_any_friendship_row(auth.uid(), ca.user_id)
  group by p.id, p.username, p.display_name, p.avatar_url
  order by max(ca.checked_in_at) desc
  limit 30;
$$;

CREATE FUNCTION public.suggested_friends_mutual(p_limit integer DEFAULT 30) RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, mutual_friend_count integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  with my_friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as friend_id
    from friendships
    where status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid())
  ),
  friends_of_friends as (
    select case when f.requester_id = mf.friend_id then f.addressee_id else f.requester_id end as candidate_id
    from friendships f
    join my_friends mf on mf.friend_id in (f.requester_id, f.addressee_id)
    where f.status = 'accepted'
  )
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    count(*)::int
  from friends_of_friends fof
  join profiles p on p.id = fof.candidate_id
  where fof.candidate_id <> auth.uid()
    and fof.candidate_id not in (select friend_id from my_friends)
    and not public.has_any_friendship_row(auth.uid(), fof.candidate_id)
  group by p.id, p.username, p.display_name, p.avatar_url
  order by count(*) desc
  limit p_limit;
$$;

CREATE FUNCTION public.take_storage_cleanup() RETURNS TABLE(bucket text, path text)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  delete from storage_cleanup
  where (storage_cleanup.bucket, storage_cleanup.path) in (
    select s.bucket, s.path from storage_cleanup s order by s.queued_at limit 500
  )
  returning storage_cleanup.bucket, storage_cleanup.path;
$$;

CREATE FUNCTION public.toggle_reaction(p_message_id uuid, p_emoji text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.trigger_send_push() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  secret_key text;
  function_url text;
begin
  select decrypted_secret into secret_key
  from vault.decrypted_secrets
  where name = 'edge_function_secret_key';

  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'send_push_function_url';

  if secret_key is null or function_url is null then
    return coalesce(NEW, OLD);
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'apiKey', secret_key),
    body := jsonb_build_object(
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'record', to_jsonb(NEW),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
    )
  );

  return NEW;
end;
$$;

CREATE FUNCTION public.unblock_user(target_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  existing friendships;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into existing from friendships
  where user_a = least(caller, target_user_id) and user_b = greatest(caller, target_user_id);

  if existing.id is null or existing.status <> 'blocked' or existing.blocked_by <> caller then
    raise exception 'Blockeringen hittades inte.';
  end if;

  delete from friendships where id = existing.id;
end;
$$;

CREATE FUNCTION public.unsend_message(p_message_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

CREATE FUNCTION public.vote_on_warning(p_spot_id uuid, p_gone boolean) RETURNS TABLE(still_there integer, gone integer, cleared boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  s spots;
  gone_votes integer;
  kept_votes integer;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into s from spots
  where id = p_spot_id
    and kind = 'varning'
    and expires_at > now()
    and (creator_id = caller or is_friend(caller, creator_id));
  if s.id is null then
    raise exception 'Varningen finns inte längre.';
  end if;

  insert into spot_votes (spot_id, user_id, gone)
  values (p_spot_id, caller, p_gone)
  on conflict (spot_id, user_id) do update set gone = excluded.gone, created_at = now();

  select count(*) filter (where v.gone), count(*) filter (where not v.gone)
  into gone_votes, kept_votes
  from spot_votes v where v.spot_id = p_spot_id;

  if gone_votes >= 5 then
    update spots set expires_at = now() where id = p_spot_id;
    return query select kept_votes, gone_votes, true;
    return;
  end if;

  return query select kept_votes, gone_votes, false;
end;
$$;

CREATE FUNCTION public.warning_votes(p_spot_id uuid) RETURNS TABLE(still_there integer, gone integer, my_vote boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from spots
    where id = p_spot_id
      and kind = 'varning'
      and expires_at > now()
      and (creator_id = caller or is_friend(caller, creator_id))
  ) then
    return;
  end if;

  return query
  select
    (count(*) filter (where not v.gone))::integer,
    (count(*) filter (where v.gone))::integer,
    (select mine.gone from spot_votes mine where mine.spot_id = p_spot_id and mine.user_id = caller)
  from spot_votes v
  where v.spot_id = p_spot_id;
end;
$$;

CREATE TABLE public.admins (
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    event_name text NOT NULL,
    props jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.cars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    make text NOT NULL,
    model text NOT NULL,
    year integer,
    nickname text,
    photo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    color text,
    CONSTRAINT cars_color_check CHECK ((color = ANY (ARRAY['rod'::text, 'bla'::text, 'gron'::text, 'gul'::text, 'orange'::text, 'vit'::text, 'svart'::text, 'silver'::text, 'lila'::text, 'rosa'::text])))
);

CREATE TABLE public.conversation_members (
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    last_read_at timestamp with time zone DEFAULT now(),
    role text DEFAULT 'member'::text NOT NULL,
    added_at timestamp with time zone,
    CONSTRAINT conversation_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
);

CREATE TABLE public.conversation_mutes (
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    muted_until timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_group boolean DEFAULT false NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_path text,
    CONSTRAINT conversations_avatar_path_in_group CHECK (((avatar_path IS NULL) OR (is_group AND (split_part(avatar_path, '/'::text, 1) = (id)::text))))
);

CREATE TABLE public.friend_code_attempts (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.friend_code_attempts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.friend_code_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.heat_points (
    user_id uuid NOT NULL,
    cell_lat double precision NOT NULL,
    cell_lng double precision NOT NULL,
    seen_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.locations (
    user_id uuid NOT NULL,
    lat double precision,
    lng double precision,
    sharing_enabled boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approximate_enabled boolean DEFAULT false NOT NULL,
    heading real,
    moving boolean DEFAULT false NOT NULL,
    status_text text,
    status_expires_at timestamp with time zone,
    CONSTRAINT locations_heading_check CHECK (((heading >= (0)::double precision) AND (heading < (360)::double precision))),
    CONSTRAINT locations_status_text_check CHECK (((char_length(btrim(status_text)) >= 1) AND (char_length(btrim(status_text)) <= 30)))
);

ALTER TABLE ONLY public.locations REPLICA IDENTITY FULL;

CREATE TABLE public.meetup_checkins (
    meetup_id uuid NOT NULL,
    user_id uuid NOT NULL,
    checked_in_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.meetup_checkins REPLICA IDENTITY FULL;

CREATE TABLE public.meetup_interests (
    meetup_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.meetup_interests REPLICA IDENTITY FULL;

CREATE TABLE public.meetups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    title text NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    vibe text DEFAULT 'cruising'::text NOT NULL,
    description text,
    CONSTRAINT meetups_description_check CHECK ((char_length(description) <= 300)),
    CONSTRAINT meetups_vibe_check CHECK ((vibe = ANY (ARRAY['cruising'::text, 'hang'::text, 'fest'::text, 'kak'::text])))
);

ALTER TABLE ONLY public.meetups REPLICA IDENTITY FULL;

CREATE VIEW public.meetups_with_stats WITH (security_invoker='true') AS
 SELECT id,
    creator_id,
    title,
    lat,
    lng,
    starts_at,
    created_at,
    vibe,
    description,
    public.meetup_interest_count(id) AS interest_count,
    public.meetup_here_now_count(id) AS here_now_count
   FROM public.meetups m;

CREATE TABLE public.message_reactions (
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT message_reactions_emoji_check CHECK ((emoji = ANY (ARRAY['❤️'::text, '😂'::text, '😮'::text, '😢'::text, '🔥'::text, '👍'::text])))
);

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_path text,
    post_id uuid,
    meetup_id uuid,
    CONSTRAINT messages_image_path_in_conversation CHECK (((image_path IS NULL) OR (split_part(image_path, '/'::text, 1) = (conversation_id)::text)))
);

CREATE TABLE public.nearby_presence (
    user_id uuid NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    seen_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nearby_presence_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))),
    CONSTRAINT nearby_presence_lng_check CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision)))
);

CREATE TABLE public.notification_settings (
    user_id uuid NOT NULL,
    messages boolean DEFAULT true NOT NULL,
    friend_requests boolean DEFAULT true NOT NULL,
    meets boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.post_places (
    post_id uuid NOT NULL,
    author_id uuid NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    CONSTRAINT post_places_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))),
    CONSTRAINT post_places_lng_check CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision)))
);

CREATE TABLE public.post_reactions (
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT post_reactions_emoji_check CHECK ((emoji = ANY (ARRAY['🔥'::text, '😂'::text, '👍'::text])))
);

CREATE TABLE public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    car_id uuid,
    body text,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    display_name text NOT NULL,
    bio text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    onboarded_at timestamp with time zone
);

CREATE TABLE public.push_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT push_tokens_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])))
);

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reporter_id uuid DEFAULT auth.uid() NOT NULL,
    reported_user_id uuid,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    reason text NOT NULL,
    details text,
    snapshot text,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reports_details_check CHECK ((char_length(details) <= 500)),
    CONSTRAINT reports_reason_check CHECK ((reason = ANY (ARRAY['hat'::text, 'sexuellt'::text, 'hot'::text, 'mobbning'::text, 'spam'::text, 'farligt'::text, 'under15'::text, 'annat'::text]))),
    CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'handled'::text]))),
    CONSTRAINT reports_target_type_check CHECK ((target_type = ANY (ARRAY['post'::text, 'message'::text, 'profile'::text, 'spot'::text, 'spot_photo'::text, 'meetup'::text, 'status'::text, 'conversation'::text])))
);

CREATE TABLE public.spot_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    spot_id uuid NOT NULL,
    author_id uuid NOT NULL,
    path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL
);

ALTER TABLE ONLY public.spot_photos REPLICA IDENTITY FULL;

CREATE TABLE public.spot_votes (
    spot_id uuid NOT NULL,
    user_id uuid NOT NULL,
    gone boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.spots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    kind text NOT NULL,
    warning_type text,
    name text,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    visibility text DEFAULT 'friends'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    CONSTRAINT spots_kind_check CHECK ((kind = ANY (ARRAY['ragg'::text, 'varning'::text]))),
    CONSTRAINT spots_kind_fields CHECK ((((kind = 'ragg'::text) AND (name IS NOT NULL) AND (warning_type IS NULL)) OR ((kind = 'varning'::text) AND (warning_type IS NOT NULL) AND (name IS NULL)))),
    CONSTRAINT spots_lat_check CHECK (((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))),
    CONSTRAINT spots_lng_check CHECK (((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))),
    CONSTRAINT spots_name_check CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 40))),
    CONSTRAINT spots_visibility_check CHECK ((visibility = 'friends'::text)),
    CONSTRAINT spots_warning_type_check CHECK ((warning_type = ANY (ARRAY['vagarbete'::text, 'halka'::text, 'grop'::text, 'avstangt'::text])))
);

ALTER TABLE ONLY public.spots REPLICA IDENTITY FULL;

CREATE TABLE public.storage_cleanup (
    bucket text NOT NULL,
    path text NOT NULL,
    queued_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_ages (
    user_id uuid NOT NULL,
    birth_year smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_ages_birth_year_check CHECK (((birth_year >= 1900) AND (birth_year <= 2100)))
);

CREATE TABLE public.waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_pkey PRIMARY KEY (conversation_id, user_id);

ALTER TABLE ONLY public.conversation_mutes
    ADD CONSTRAINT conversation_mutes_pkey PRIMARY KEY (conversation_id, user_id);

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.friend_code_attempts
    ADD CONSTRAINT friend_code_attempts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.friend_codes
    ADD CONSTRAINT friend_codes_code_key UNIQUE (code);

ALTER TABLE ONLY public.friend_codes
    ADD CONSTRAINT friend_codes_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_user_a_user_b_key UNIQUE (user_a, user_b);

ALTER TABLE ONLY public.heat_points
    ADD CONSTRAINT heat_points_pkey PRIMARY KEY (user_id, cell_lat, cell_lng);

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.meetup_checkins
    ADD CONSTRAINT meetup_checkins_pkey PRIMARY KEY (meetup_id, user_id);

ALTER TABLE ONLY public.meetup_interests
    ADD CONSTRAINT meetup_interests_pkey PRIMARY KEY (meetup_id, user_id);

ALTER TABLE ONLY public.meetups
    ADD CONSTRAINT meetups_pkey PRIMARY KEY (id);

ALTER TABLE public.meetups
    ADD CONSTRAINT meetups_title_length CHECK (((char_length(btrim(title)) >= 1) AND (char_length(btrim(title)) <= 60))) NOT VALID;

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (message_id, user_id);

ALTER TABLE public.messages
    ADD CONSTRAINT messages_body_image_or_post CHECK (((btrim(body) <> ''::text) OR (image_path IS NOT NULL) OR (post_id IS NOT NULL))) NOT VALID;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.nearby_presence
    ADD CONSTRAINT nearby_presence_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.post_places
    ADD CONSTRAINT post_places_pkey PRIMARY KEY (post_id);

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (post_id, user_id, emoji);

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_user_id_token_key UNIQUE (user_id, token);

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.spot_photos
    ADD CONSTRAINT spot_photos_path_key UNIQUE (path);

ALTER TABLE ONLY public.spot_photos
    ADD CONSTRAINT spot_photos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.spot_votes
    ADD CONSTRAINT spot_votes_pkey PRIMARY KEY (spot_id, user_id);

ALTER TABLE ONLY public.spots
    ADD CONSTRAINT spots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.storage_cleanup
    ADD CONSTRAINT storage_cleanup_pkey PRIMARY KEY (bucket, path);

ALTER TABLE ONLY public.user_ages
    ADD CONSTRAINT user_ages_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_email_key UNIQUE (email);

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_pkey PRIMARY KEY (id);

CREATE INDEX conversation_members_user_id_idx ON public.conversation_members USING btree (user_id);

CREATE INDEX friend_code_attempts_user_time_idx ON public.friend_code_attempts USING btree (user_id, attempted_at);

CREATE INDEX friendships_addressee_id_idx ON public.friendships USING btree (addressee_id);

CREATE INDEX friendships_addressee_pending_idx ON public.friendships USING btree (addressee_id) WHERE (status = 'pending'::text);

CREATE INDEX friendships_requester_id_idx ON public.friendships USING btree (requester_id);

CREATE INDEX heat_points_seen_at_idx ON public.heat_points USING btree (seen_at);

CREATE INDEX meetups_starts_at_idx ON public.meetups USING btree (starts_at);

CREATE INDEX messages_conversation_id_created_at_idx ON public.messages USING btree (conversation_id, created_at);

CREATE INDEX messages_meetup_id_idx ON public.messages USING btree (meetup_id) WHERE (meetup_id IS NOT NULL);

CREATE INDEX nearby_presence_seen_at_idx ON public.nearby_presence USING btree (seen_at);

CREATE INDEX post_places_author_id_idx ON public.post_places USING btree (author_id);

CREATE INDEX post_places_expires_at_idx ON public.post_places USING btree (expires_at);

CREATE INDEX post_reactions_user_id_idx ON public.post_reactions USING btree (user_id);

CREATE INDEX posts_created_at_idx ON public.posts USING btree (created_at DESC);

CREATE INDEX reports_reporter_created_idx ON public.reports USING btree (reporter_id, created_at);

CREATE UNIQUE INDEX reports_reporter_target_snapshot_key ON public.reports USING btree (reporter_id, target_type, target_id, md5(COALESCE(snapshot, ''::text)));

CREATE INDEX spot_photos_spot_id_idx ON public.spot_photos USING btree (spot_id);

CREATE INDEX spot_votes_user_id_idx ON public.spot_votes USING btree (user_id);

CREATE INDEX spots_creator_id_idx ON public.spots USING btree (creator_id);

CREATE INDEX spots_expires_at_idx ON public.spots USING btree (expires_at);

CREATE TRIGGER locations_fuzz_before_write BEFORE INSERT OR UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.fuzz_location_before_write();

CREATE TRIGGER locations_record_heat AFTER INSERT OR UPDATE OF lat, lng, sharing_enabled ON public.locations FOR EACH ROW EXECUTE FUNCTION public.record_heat_point();

CREATE TRIGGER locations_status_expiry BEFORE INSERT OR UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.set_status_expiry();

CREATE TRIGGER meetups_keep_identity BEFORE UPDATE ON public.meetups FOR EACH ROW EXECUTE FUNCTION public.keep_meetup_identity();

CREATE TRIGGER on_friendships_change_send_push AFTER INSERT OR UPDATE ON public.friendships FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

CREATE TRIGGER on_meetup_interests_insert_send_push AFTER INSERT ON public.meetup_interests FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

CREATE TRIGGER on_messages_insert_send_push AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

CREATE TRIGGER post_places_set_expiry BEFORE INSERT ON public.post_places FOR EACH ROW EXECUTE FUNCTION public.set_post_place_expiry();

CREATE TRIGGER reports_notify AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.notify_report();

CREATE TRIGGER spot_photos_queue_file AFTER DELETE ON public.spot_photos FOR EACH ROW EXECUTE FUNCTION public.queue_spot_photo_file();

CREATE TRIGGER spot_photos_set_expiry BEFORE INSERT ON public.spot_photos FOR EACH ROW EXECUTE FUNCTION public.set_spot_photo_expiry();

CREATE TRIGGER spots_set_expiry BEFORE INSERT ON public.spots FOR EACH ROW EXECUTE FUNCTION public.set_spot_expiry();

CREATE TRIGGER user_ages_minimum_age BEFORE INSERT ON public.user_ages FOR EACH ROW EXECUTE FUNCTION public.check_minimum_age();

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.cars
    ADD CONSTRAINT cars_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.conversation_members
    ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.conversation_mutes
    ADD CONSTRAINT conversation_mutes_conversation_id_user_id_fkey FOREIGN KEY (conversation_id, user_id) REFERENCES public.conversation_members(conversation_id, user_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.friend_code_attempts
    ADD CONSTRAINT friend_code_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.friend_codes
    ADD CONSTRAINT friend_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_blocked_by_fkey FOREIGN KEY (blocked_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.heat_points
    ADD CONSTRAINT heat_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.meetup_checkins
    ADD CONSTRAINT meetup_checkins_meetup_id_fkey FOREIGN KEY (meetup_id) REFERENCES public.meetups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.meetup_checkins
    ADD CONSTRAINT meetup_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.meetup_interests
    ADD CONSTRAINT meetup_interests_meetup_id_fkey FOREIGN KEY (meetup_id) REFERENCES public.meetups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.meetup_interests
    ADD CONSTRAINT meetup_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.meetups
    ADD CONSTRAINT meetups_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_meetup_id_fkey FOREIGN KEY (meetup_id) REFERENCES public.meetups(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.nearby_presence
    ADD CONSTRAINT nearby_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.post_places
    ADD CONSTRAINT post_places_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.post_places
    ADD CONSTRAINT post_places_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_car_id_fkey FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.push_tokens
    ADD CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.spot_photos
    ADD CONSTRAINT spot_photos_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.spot_photos
    ADD CONSTRAINT spot_photos_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.spot_votes
    ADD CONSTRAINT spot_votes_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.spots(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.spot_votes
    ADD CONSTRAINT spot_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.spots
    ADD CONSTRAINT spots_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_ages
    ADD CONSTRAINT user_ages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read all reports" ON public.reports FOR SELECT TO authenticated USING (public.is_admin());

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can record their own events" ON public.analytics_events FOR INSERT WITH CHECK (((user_id IS NULL) OR (user_id = auth.uid())));

CREATE POLICY "authenticated users create meetups" ON public.meetups FOR INSERT TO authenticated WITH CHECK ((auth.uid() = creator_id));

CREATE POLICY "authors and friends read posts" ON public.posts FOR SELECT TO authenticated USING (((auth.uid() = author_id) OR public.is_friend(auth.uid(), author_id)));

CREATE POLICY "authors and spot creators remove photos" ON public.spot_photos FOR DELETE TO authenticated USING (((author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.spots s
  WHERE ((s.id = spot_photos.spot_id) AND (s.creator_id = auth.uid()))))));

CREATE POLICY "authors drop their new posts on the map" ON public.post_places FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_places.post_id) AND (p.author_id = auth.uid()) AND (p.created_at > (now() - '01:00:00'::interval)))))));

CREATE POLICY "authors remove their post places" ON public.post_places FOR DELETE TO authenticated USING ((author_id = auth.uid()));

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cars are readable by everyone" ON public.cars FOR SELECT TO authenticated USING (true);

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_mutes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator and friends see current meetups" ON public.meetups FOR SELECT TO authenticated USING (((starts_at > (now() - '1 day'::interval)) AND ((creator_id = auth.uid()) OR public.is_friend(auth.uid(), creator_id))));

CREATE POLICY "creator deletes their meetup" ON public.meetups FOR DELETE TO authenticated USING ((auth.uid() = creator_id));

CREATE POLICY "creator updates their meetup" ON public.meetups FOR UPDATE TO authenticated USING ((auth.uid() = creator_id)) WITH CHECK (((auth.uid() = creator_id) AND (starts_at > (now() - '1 day'::interval)) AND (starts_at < (now() + '60 days'::interval)) AND ((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision)) AND ((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))));

ALTER TABLE public.friend_code_attempts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.friend_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.heat_points ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.meetup_checkins ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.meetup_interests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND public.is_conversation_member(conversation_id, auth.uid()) AND (NOT public.is_blocked_direct_chat(conversation_id, auth.uid()))));

CREATE POLICY "members can view conversation members" ON public.conversation_members FOR SELECT TO authenticated USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "members can view messages" ON public.messages FOR SELECT TO authenticated USING (public.can_see_message(conversation_id, created_at));

CREATE POLICY "members can view reactions in their conversations" ON public.message_reactions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.messages m
  WHERE ((m.id = message_reactions.message_id) AND public.is_conversation_member(m.conversation_id, auth.uid())))));

CREATE POLICY "members can view their conversations" ON public.conversations FOR SELECT TO authenticated USING (public.is_conversation_member(id, auth.uid()));

CREATE POLICY "members read their own mutes" ON public.conversation_mutes FOR SELECT TO authenticated USING ((user_id = auth.uid()));

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nearby_presence ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own and friends' checkins are visible" ON public.meetup_checkins FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_friend(auth.uid(), user_id)));

CREATE POLICY "own, friends' and own meetups' interest is visible" ON public.meetup_interests FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_friend(auth.uid(), user_id) OR (EXISTS ( SELECT 1
   FROM public.meetups m
  WHERE ((m.id = meetup_interests.meetup_id) AND (m.creator_id = auth.uid()))))));

CREATE POLICY "owner and friends view fresh shared locations" ON public.locations FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (sharing_enabled AND (lat IS NOT NULL) AND (updated_at > (now() - '12:00:00'::interval)) AND public.is_friend(auth.uid(), user_id))));

CREATE POLICY "owner and kompisar see live post places" ON public.post_places FOR SELECT TO authenticated USING (((expires_at > now()) AND ((author_id = auth.uid()) OR public.is_friend(auth.uid(), author_id))));

CREATE POLICY "owners view their own friend code" ON public.friend_codes FOR SELECT TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "participants remove their non-blocked friendships" ON public.friendships FOR DELETE TO authenticated USING ((((auth.uid() = requester_id) OR (auth.uid() = addressee_id)) AND (status <> 'blocked'::text)));

CREATE POLICY "participants view their friendships" ON public.friendships FOR SELECT TO authenticated USING ((((auth.uid() = requester_id) OR (auth.uid() = addressee_id)) AND ((status <> 'blocked'::text) OR (auth.uid() = blocked_by))));

CREATE POLICY "people add photos to Raggställen they can see" ON public.spot_photos FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.spots s
  WHERE ((s.id = spot_photos.spot_id) AND (s.kind = 'ragg'::text)))) AND (split_part(path, '/'::text, 1) = (spot_id)::text)));

CREATE POLICY "people change their own notification settings" ON public.notification_settings FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "people create their own notification settings" ON public.notification_settings FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "people create their own spots" ON public.spots FOR INSERT TO authenticated WITH CHECK ((creator_id = auth.uid()));

CREATE POLICY "people file reports as themselves" ON public.reports FOR INSERT TO authenticated WITH CHECK ((reporter_id = auth.uid()));

CREATE POLICY "people react to posts they can see" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE (p.id = post_reactions.post_id)))));

CREATE POLICY "people read their own birth year" ON public.user_ages FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "people read their own notification settings" ON public.notification_settings FOR SELECT TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "people remove their own reactions" ON public.post_reactions FOR DELETE TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "people remove their own spots" ON public.spots FOR DELETE TO authenticated USING ((creator_id = auth.uid()));

CREATE POLICY "people see fresh photos on spots they can see" ON public.spot_photos FOR SELECT TO authenticated USING (((expires_at > now()) AND (EXISTS ( SELECT 1
   FROM public.spots s
  WHERE (s.id = spot_photos.spot_id))) AND (NOT public.is_blocked_between(auth.uid(), author_id))));

CREATE POLICY "people see their own and friends' live spots" ON public.spots FOR SELECT TO authenticated USING (((expires_at > now()) AND ((creator_id = auth.uid()) OR public.is_friend(auth.uid(), creator_id))));

CREATE POLICY "people see their own reports" ON public.reports FOR SELECT TO authenticated USING ((reporter_id = auth.uid()));

CREATE POLICY "people see their own votes on live warnings" ON public.spot_votes FOR SELECT TO authenticated USING (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.spots s
  WHERE (s.id = spot_votes.spot_id)))));

CREATE POLICY "people set their own birth year once" ON public.user_ages FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

ALTER TABLE public.post_places ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles are readable by everyone" ON public.profiles FOR SELECT TO authenticated USING (true);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions by me, my kompisar or on my posts are readable" ON public.post_reactions FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.posts p
  WHERE (p.id = post_reactions.post_id))) AND ((user_id = auth.uid()) OR public.is_friend(auth.uid(), user_id) OR (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE ((p.id = post_reactions.post_id) AND (p.author_id = auth.uid())))))));

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared meetups must be visible to the sender" ON public.messages AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (((meetup_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.meetups m
  WHERE (m.id = messages.meetup_id)))));

CREATE POLICY "shared posts must be visible to the sender" ON public.messages AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (((post_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.posts p
  WHERE (p.id = messages.post_id)))));

ALTER TABLE public.spot_photos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.spot_votes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.storage_cleanup ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_ages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users delete their own cars" ON public.cars FOR DELETE TO authenticated USING ((auth.uid() = owner_id));

CREATE POLICY "users delete their own location" ON public.locations FOR DELETE TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "users delete their own posts" ON public.posts FOR DELETE TO authenticated USING ((auth.uid() = author_id));

CREATE POLICY "users delete their own push tokens" ON public.push_tokens FOR DELETE TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "users insert their own push tokens" ON public.push_tokens FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "users manage their own cars" ON public.cars FOR INSERT TO authenticated WITH CHECK ((auth.uid() = owner_id));

CREATE POLICY "users manage their own location" ON public.locations FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "users manage their own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK ((auth.uid() = author_id));

CREATE POLICY "users manage their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));

CREATE POLICY "users mark their own interest" ON public.meetup_interests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "users remove their own interest" ON public.meetup_interests FOR DELETE TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "users update their own cars" ON public.cars FOR UPDATE TO authenticated USING ((auth.uid() = owner_id));

CREATE POLICY "users update their own location" ON public.locations FOR UPDATE TO authenticated USING ((auth.uid() = user_id));

CREATE POLICY "users update their own posts" ON public.posts FOR UPDATE TO authenticated USING ((auth.uid() = author_id));

CREATE POLICY "users update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));

CREATE POLICY "users update their own push tokens" ON public.push_tokens FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "users view their own push tokens" ON public.push_tokens FOR SELECT TO authenticated USING ((auth.uid() = user_id));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.add_conversation_members(p_conversation_id uuid, p_user_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.add_conversation_members(p_conversation_id uuid, p_user_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.add_conversation_members(p_conversation_id uuid, p_user_ids uuid[]) TO service_role;

REVOKE ALL ON FUNCTION public.admin_mark_report_handled(p_report_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_mark_report_handled(p_report_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_mark_report_handled(p_report_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.admin_open_reports() FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_open_reports() TO authenticated;
GRANT ALL ON FUNCTION public.admin_open_reports() TO service_role;

REVOKE ALL ON FUNCTION public.admin_remove_reported_content(p_report_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.admin_remove_reported_content(p_report_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.admin_remove_reported_content(p_report_id uuid) TO service_role;

GRANT ALL ON TABLE public.friendships TO anon;
GRANT ALL ON TABLE public.friendships TO authenticated;
GRANT ALL ON TABLE public.friendships TO service_role;

REVOKE ALL ON FUNCTION public.block_user(target_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.block_user(target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.block_user(target_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.can_see_message(p_conversation_id uuid, p_created_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.can_see_message(p_conversation_id uuid, p_created_at timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.can_see_message(p_conversation_id uuid, p_created_at timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.check_in_at_meetup(p_meetup_id uuid, p_lat double precision, p_lng double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_in_at_meetup(p_meetup_id uuid, p_lat double precision, p_lng double precision) TO authenticated;
GRANT ALL ON FUNCTION public.check_in_at_meetup(p_meetup_id uuid, p_lat double precision, p_lng double precision) TO service_role;

REVOKE ALL ON FUNCTION public.check_minimum_age() FROM PUBLIC;
GRANT ALL ON FUNCTION public.check_minimum_age() TO service_role;

REVOKE ALL ON FUNCTION public.create_conversation(other_user_ids uuid[], group_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_conversation(other_user_ids uuid[], group_name text) TO authenticated;
GRANT ALL ON FUNCTION public.create_conversation(other_user_ids uuid[], group_name text) TO service_role;

GRANT ALL ON TABLE public.friend_codes TO anon;
GRANT ALL ON TABLE public.friend_codes TO authenticated;
GRANT ALL ON TABLE public.friend_codes TO service_role;

REVOKE ALL ON FUNCTION public.current_friend_code(rotate boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.current_friend_code(rotate boolean) TO authenticated;
GRANT ALL ON FUNCTION public.current_friend_code(rotate boolean) TO service_role;

REVOKE ALL ON FUNCTION public.evening_heat() FROM PUBLIC;
GRANT ALL ON FUNCTION public.evening_heat() TO authenticated;
GRANT ALL ON FUNCTION public.evening_heat() TO service_role;

REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC;
GRANT ALL ON FUNCTION public.export_my_data() TO authenticated;
GRANT ALL ON FUNCTION public.export_my_data() TO service_role;

REVOKE ALL ON FUNCTION public.fuzz_location_before_write() FROM PUBLIC;
GRANT ALL ON FUNCTION public.fuzz_location_before_write() TO service_role;

REVOKE ALL ON FUNCTION public.generate_friend_code() FROM PUBLIC;
GRANT ALL ON FUNCTION public.generate_friend_code() TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.has_any_friendship_row(a uuid, b uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_any_friendship_row(a uuid, b uuid) TO authenticated;
GRANT ALL ON FUNCTION public.has_any_friendship_row(a uuid, b uuid) TO service_role;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;

REVOKE ALL ON FUNCTION public.is_blocked_between(a uuid, b uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_blocked_between(a uuid, b uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_blocked_between(a uuid, b uuid) TO service_role;

REVOKE ALL ON FUNCTION public.is_blocked_direct_chat(p_conversation_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_blocked_direct_chat(p_conversation_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_blocked_direct_chat(p_conversation_id uuid, p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.is_conversation_member(conversation_id uuid, user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_conversation_member(conversation_id uuid, user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_conversation_member(conversation_id uuid, user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.is_friend(a uuid, b uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_friend(a uuid, b uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_friend(a uuid, b uuid) TO service_role;

REVOKE ALL ON FUNCTION public.is_group_member(p_conversation_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_group_member(p_conversation_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_group_member(p_conversation_id uuid, p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.keep_meetup_identity() FROM PUBLIC;
GRANT ALL ON FUNCTION public.keep_meetup_identity() TO service_role;

REVOKE ALL ON FUNCTION public.leave_conversation(p_conversation_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.leave_conversation(p_conversation_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.leave_conversation(p_conversation_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.leave_nearby() FROM PUBLIC;
GRANT ALL ON FUNCTION public.leave_nearby() TO authenticated;
GRANT ALL ON FUNCTION public.leave_nearby() TO service_role;

REVOKE ALL ON FUNCTION public.mark_conversation_read(p_conversation_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.mark_conversation_read(p_conversation_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.mark_conversation_read(p_conversation_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.meetup_here_now_count(p_meetup_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.meetup_here_now_count(p_meetup_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.meetup_here_now_count(p_meetup_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.meetup_interest_count(p_meetup_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.meetup_interest_count(p_meetup_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.meetup_interest_count(p_meetup_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.mutual_friends(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.mutual_friends(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.mutual_friends(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.notify_report() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_report() TO service_role;

REVOKE ALL ON FUNCTION public.prepare_account_deletion(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.prepare_account_deletion(p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.purge_expired_map_data() FROM PUBLIC;
GRANT ALL ON FUNCTION public.purge_expired_map_data() TO service_role;

REVOKE ALL ON FUNCTION public.purge_expired_mutes() FROM PUBLIC;
GRANT ALL ON FUNCTION public.purge_expired_mutes() TO service_role;

REVOKE ALL ON FUNCTION public.purge_expired_post_places() FROM PUBLIC;
GRANT ALL ON FUNCTION public.purge_expired_post_places() TO service_role;

REVOKE ALL ON FUNCTION public.queue_spot_photo_file() FROM PUBLIC;
GRANT ALL ON FUNCTION public.queue_spot_photo_file() TO service_role;

REVOKE ALL ON FUNCTION public.record_heat_point() FROM PUBLIC;
GRANT ALL ON FUNCTION public.record_heat_point() TO service_role;

REVOKE ALL ON FUNCTION public.redeem_friend_code(friend_code text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.redeem_friend_code(friend_code text) TO authenticated;
GRANT ALL ON FUNCTION public.redeem_friend_code(friend_code text) TO service_role;

REVOKE ALL ON FUNCTION public.remove_member(p_conversation_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.remove_member(p_conversation_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.remove_member(p_conversation_id uuid, p_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.rename_conversation(p_conversation_id uuid, p_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.rename_conversation(p_conversation_id uuid, p_name text) TO authenticated;
GRANT ALL ON FUNCTION public.rename_conversation(p_conversation_id uuid, p_name text) TO service_role;

REVOKE ALL ON FUNCTION public.report_content(p_target_type text, p_target_id uuid, p_reason text, p_details text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.report_content(p_target_type text, p_target_id uuid, p_reason text, p_details text) TO authenticated;
GRANT ALL ON FUNCTION public.report_content(p_target_type text, p_target_id uuid, p_reason text, p_details text) TO service_role;

REVOKE ALL ON FUNCTION public.request_storage_cleanup() FROM PUBLIC;
GRANT ALL ON FUNCTION public.request_storage_cleanup() TO service_role;

REVOKE ALL ON FUNCTION public.respond_to_friend_request(request_id uuid, accept boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.respond_to_friend_request(request_id uuid, accept boolean) TO authenticated;
GRANT ALL ON FUNCTION public.respond_to_friend_request(request_id uuid, accept boolean) TO service_role;

REVOKE ALL ON FUNCTION public.scan_nearby(p_lat double precision, p_lng double precision) FROM PUBLIC;
GRANT ALL ON FUNCTION public.scan_nearby(p_lat double precision, p_lng double precision) TO authenticated;
GRANT ALL ON FUNCTION public.scan_nearby(p_lat double precision, p_lng double precision) TO service_role;

REVOKE ALL ON FUNCTION public.send_friend_request(target_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.send_friend_request(target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.send_friend_request(target_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.set_conversation_mute(p_conversation_id uuid, p_until timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_conversation_mute(p_conversation_id uuid, p_until timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.set_conversation_mute(p_conversation_id uuid, p_until timestamp with time zone) TO service_role;

REVOKE ALL ON FUNCTION public.set_group_avatar(p_conversation_id uuid, p_path text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_group_avatar(p_conversation_id uuid, p_path text) TO authenticated;
GRANT ALL ON FUNCTION public.set_group_avatar(p_conversation_id uuid, p_path text) TO service_role;

REVOKE ALL ON FUNCTION public.set_post_place_expiry() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_post_place_expiry() TO service_role;

REVOKE ALL ON FUNCTION public.set_spot_expiry() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_spot_expiry() TO service_role;

REVOKE ALL ON FUNCTION public.set_spot_photo_expiry() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_spot_photo_expiry() TO service_role;

REVOKE ALL ON FUNCTION public.set_status_expiry() FROM PUBLIC;
GRANT ALL ON FUNCTION public.set_status_expiry() TO service_role;

REVOKE ALL ON FUNCTION public.suggested_friends_from_meetups() FROM PUBLIC;
GRANT ALL ON FUNCTION public.suggested_friends_from_meetups() TO authenticated;
GRANT ALL ON FUNCTION public.suggested_friends_from_meetups() TO service_role;

REVOKE ALL ON FUNCTION public.suggested_friends_mutual(p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.suggested_friends_mutual(p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.suggested_friends_mutual(p_limit integer) TO service_role;

REVOKE ALL ON FUNCTION public.take_storage_cleanup() FROM PUBLIC;
GRANT ALL ON FUNCTION public.take_storage_cleanup() TO service_role;

REVOKE ALL ON FUNCTION public.toggle_reaction(p_message_id uuid, p_emoji text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.toggle_reaction(p_message_id uuid, p_emoji text) TO authenticated;
GRANT ALL ON FUNCTION public.toggle_reaction(p_message_id uuid, p_emoji text) TO service_role;

REVOKE ALL ON FUNCTION public.trigger_send_push() FROM PUBLIC;
GRANT ALL ON FUNCTION public.trigger_send_push() TO service_role;

REVOKE ALL ON FUNCTION public.unblock_user(target_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.unblock_user(target_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.unblock_user(target_user_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.unsend_message(p_message_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.unsend_message(p_message_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.unsend_message(p_message_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.vote_on_warning(p_spot_id uuid, p_gone boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION public.vote_on_warning(p_spot_id uuid, p_gone boolean) TO authenticated;
GRANT ALL ON FUNCTION public.vote_on_warning(p_spot_id uuid, p_gone boolean) TO service_role;

REVOKE ALL ON FUNCTION public.warning_votes(p_spot_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.warning_votes(p_spot_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.warning_votes(p_spot_id uuid) TO service_role;

GRANT ALL ON TABLE public.admins TO service_role;

GRANT ALL ON TABLE public.analytics_events TO anon;
GRANT ALL ON TABLE public.analytics_events TO authenticated;
GRANT ALL ON TABLE public.analytics_events TO service_role;

GRANT ALL ON TABLE public.cars TO anon;
GRANT ALL ON TABLE public.cars TO authenticated;
GRANT ALL ON TABLE public.cars TO service_role;

GRANT ALL ON TABLE public.conversation_members TO anon;
GRANT ALL ON TABLE public.conversation_members TO authenticated;
GRANT ALL ON TABLE public.conversation_members TO service_role;

GRANT ALL ON TABLE public.conversation_mutes TO anon;
GRANT ALL ON TABLE public.conversation_mutes TO authenticated;
GRANT ALL ON TABLE public.conversation_mutes TO service_role;

GRANT ALL ON TABLE public.conversations TO anon;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;

GRANT ALL ON TABLE public.friend_code_attempts TO anon;
GRANT ALL ON TABLE public.friend_code_attempts TO authenticated;
GRANT ALL ON TABLE public.friend_code_attempts TO service_role;

GRANT ALL ON SEQUENCE public.friend_code_attempts_id_seq TO anon;
GRANT ALL ON SEQUENCE public.friend_code_attempts_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.friend_code_attempts_id_seq TO service_role;

GRANT ALL ON TABLE public.heat_points TO anon;
GRANT ALL ON TABLE public.heat_points TO authenticated;
GRANT ALL ON TABLE public.heat_points TO service_role;

GRANT ALL ON TABLE public.locations TO anon;
GRANT ALL ON TABLE public.locations TO authenticated;
GRANT ALL ON TABLE public.locations TO service_role;

GRANT ALL ON TABLE public.meetup_checkins TO anon;
GRANT ALL ON TABLE public.meetup_checkins TO authenticated;
GRANT ALL ON TABLE public.meetup_checkins TO service_role;

GRANT ALL ON TABLE public.meetup_interests TO anon;
GRANT ALL ON TABLE public.meetup_interests TO authenticated;
GRANT ALL ON TABLE public.meetup_interests TO service_role;

GRANT ALL ON TABLE public.meetups TO anon;
GRANT ALL ON TABLE public.meetups TO authenticated;
GRANT ALL ON TABLE public.meetups TO service_role;

GRANT ALL ON TABLE public.meetups_with_stats TO authenticated;
GRANT ALL ON TABLE public.meetups_with_stats TO service_role;

GRANT ALL ON TABLE public.message_reactions TO anon;
GRANT ALL ON TABLE public.message_reactions TO authenticated;
GRANT ALL ON TABLE public.message_reactions TO service_role;

GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;

GRANT ALL ON TABLE public.nearby_presence TO anon;
GRANT ALL ON TABLE public.nearby_presence TO authenticated;
GRANT ALL ON TABLE public.nearby_presence TO service_role;

GRANT SELECT,INSERT,REFERENCES,TRIGGER,MAINTAIN,UPDATE ON TABLE public.notification_settings TO authenticated;
GRANT ALL ON TABLE public.notification_settings TO service_role;

GRANT ALL ON TABLE public.post_places TO anon;
GRANT ALL ON TABLE public.post_places TO authenticated;
GRANT ALL ON TABLE public.post_places TO service_role;

GRANT ALL ON TABLE public.post_reactions TO anon;
GRANT ALL ON TABLE public.post_reactions TO authenticated;
GRANT ALL ON TABLE public.post_reactions TO service_role;

GRANT ALL ON TABLE public.posts TO anon;
GRANT ALL ON TABLE public.posts TO authenticated;
GRANT ALL ON TABLE public.posts TO service_role;

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

GRANT ALL ON TABLE public.push_tokens TO anon;
GRANT ALL ON TABLE public.push_tokens TO authenticated;
GRANT ALL ON TABLE public.push_tokens TO service_role;

GRANT SELECT,INSERT,REFERENCES,TRIGGER,MAINTAIN ON TABLE public.reports TO anon;
GRANT SELECT,INSERT,REFERENCES,TRIGGER,MAINTAIN ON TABLE public.reports TO authenticated;
GRANT ALL ON TABLE public.reports TO service_role;

GRANT ALL ON TABLE public.spot_photos TO anon;
GRANT ALL ON TABLE public.spot_photos TO authenticated;
GRANT ALL ON TABLE public.spot_photos TO service_role;

GRANT ALL ON TABLE public.spot_votes TO anon;
GRANT ALL ON TABLE public.spot_votes TO authenticated;
GRANT ALL ON TABLE public.spot_votes TO service_role;

GRANT ALL ON TABLE public.spots TO anon;
GRANT ALL ON TABLE public.spots TO authenticated;
GRANT ALL ON TABLE public.spots TO service_role;

GRANT ALL ON TABLE public.storage_cleanup TO anon;
GRANT ALL ON TABLE public.storage_cleanup TO authenticated;
GRANT ALL ON TABLE public.storage_cleanup TO service_role;

GRANT SELECT,INSERT,REFERENCES,TRIGGER,MAINTAIN ON TABLE public.user_ages TO anon;
GRANT SELECT,INSERT,REFERENCES,TRIGGER,MAINTAIN ON TABLE public.user_ages TO authenticated;
GRANT ALL ON TABLE public.user_ages TO service_role;

GRANT ALL ON TABLE public.waitlist TO anon;
GRANT ALL ON TABLE public.waitlist TO authenticated;
GRANT ALL ON TABLE public.waitlist TO service_role;

SELECT pg_catalog.set_config('search_path', 'public', false);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('avatars', 'avatars', true, 10485760, '{image/jpeg,image/png,image/webp}') on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('car-photos', 'car-photos', true, 10485760, '{image/jpeg,image/png,image/webp}') on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('chat-images', 'chat-images', false, 10485760, '{image/jpeg,image/png,image/webp}') on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('group-avatars', 'group-avatars', false, 10485760, '{image/jpeg,image/png,image/webp}') on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('post-images', 'post-images', false, 10485760, '{image/jpeg,image/png,image/webp}') on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('spot-photos', 'spot-photos', false, 10485760, '{image/jpeg,image/png,image/webp}') on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "avatar images are publicly accessible" on storage.objects;
create policy "avatar images are publicly accessible" on storage.objects as permissive for select to authenticated
  using ((bucket_id = 'avatars'::text));
drop policy if exists "car photos are publicly accessible" on storage.objects;
create policy "car photos are publicly accessible" on storage.objects as permissive for select to authenticated
  using ((bucket_id = 'car-photos'::text));
drop policy if exists "members delete their groups' avatars" on storage.objects;
create policy "members delete their groups' avatars" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'group-avatars'::text) AND is_group_member(((storage.foldername(name))[1])::uuid, auth.uid())));
drop policy if exists "members read their conversations' chat images" on storage.objects;
create policy "members read their conversations' chat images" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'chat-images'::text) AND is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())));
drop policy if exists "members read their groups' avatars" on storage.objects;
create policy "members read their groups' avatars" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'group-avatars'::text) AND is_group_member(((storage.foldername(name))[1])::uuid, auth.uid())));
drop policy if exists "members upload avatars to their groups" on storage.objects;
create policy "members upload avatars to their groups" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'group-avatars'::text) AND is_group_member(((storage.foldername(name))[1])::uuid, auth.uid())));
drop policy if exists "members upload chat images to their conversations" on storage.objects;
create policy "members upload chat images to their conversations" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'chat-images'::text) AND is_conversation_member(((storage.foldername(name))[1])::uuid, auth.uid())));
drop policy if exists "owners and people who can see the post read post images" on storage.objects;
create policy "owners and people who can see the post read post images" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'post-images'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM posts p
  WHERE (p.image_url = objects.name))))));
drop policy if exists "people read spot photos they can see" on storage.objects;
create policy "people read spot photos they can see" on storage.objects as permissive for select to authenticated
  using (((bucket_id = 'spot-photos'::text) AND ((owner_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM spot_photos p
  WHERE (p.path = objects.name))))));
drop policy if exists "people upload their own photos to Raggställen they can see" on storage.objects;
create policy "people upload their own photos to Raggställen they can see" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'spot-photos'::text) AND (storage.filename(name) ~~ ((auth.uid())::text || '-%'::text)) AND (EXISTS ( SELECT 1
   FROM spots s
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (s.kind = 'ragg'::text))))));
drop policy if exists "uploaders delete their own chat images" on storage.objects;
create policy "uploaders delete their own chat images" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'chat-images'::text) AND (owner_id = (auth.uid())::text)));
drop policy if exists "uploaders delete their own spot photos" on storage.objects;
create policy "uploaders delete their own spot photos" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'spot-photos'::text) AND (owner_id = (auth.uid())::text)));
drop policy if exists "users delete their own avatar" on storage.objects;
create policy "users delete their own avatar" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users delete their own car photos" on storage.objects;
create policy "users delete their own car photos" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'car-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users delete their own post images" on storage.objects;
create policy "users delete their own post images" on storage.objects as permissive for delete to authenticated
  using (((bucket_id = 'post-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users update their own avatar" on storage.objects;
create policy "users update their own avatar" on storage.objects as permissive for update to authenticated
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users update their own car photos" on storage.objects;
create policy "users update their own car photos" on storage.objects as permissive for update to authenticated
  using (((bucket_id = 'car-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users update their own post images" on storage.objects;
create policy "users update their own post images" on storage.objects as permissive for update to authenticated
  using (((bucket_id = 'post-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users upload their own avatar" on storage.objects;
create policy "users upload their own avatar" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users upload their own car photos" on storage.objects;
create policy "users upload their own car photos" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'car-photos'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop policy if exists "users upload their own post images" on storage.objects;
create policy "users upload their own post images" on storage.objects as permissive for insert to authenticated
  with check (((bucket_id = 'post-images'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
select cron.schedule('purge-expired-map-data', '*/10 * * * *', 'select public.purge_expired_map_data(); select public.request_storage_cleanup();');
select cron.schedule('purge-expired-mutes', '17 * * * *', 'select public.purge_expired_mutes()');
select cron.schedule('purge-expired-post-places', '*/10 * * * *', 'select public.purge_expired_post_places();');
alter publication supabase_realtime add table public.conversation_members, public.conversations, public.friendships, public.locations, public.meetup_checkins, public.meetup_interests, public.meetups, public.message_reactions, public.messages, public.spot_photos, public.spots;

alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres revoke execute on functions from public;
