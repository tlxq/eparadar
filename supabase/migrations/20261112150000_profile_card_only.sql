create table public.profile_bios (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bio text not null check (char_length(bio) between 1 and 160),
  updated_at timestamptz not null default now()
);

alter table public.profile_bios enable row level security;

insert into public.profile_bios (user_id, bio)
select id, left(btrim(bio), 160) from public.profiles where btrim(coalesce(bio, '')) <> '';

revoke all on public.profile_bios from public, anon;
grant select, insert, update, delete on public.profile_bios to authenticated;

create policy "owner and friends read bios"
  on public.profile_bios for select to authenticated
  using ((select auth.uid()) = user_id or public.is_friend((select auth.uid()), user_id));

create policy "admins read bios"
  on public.profile_bios for select to authenticated
  using (public.is_admin());

create policy "owner adds own bio"
  on public.profile_bios for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "owner updates own bio"
  on public.profile_bios for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "owner deletes own bio"
  on public.profile_bios for delete to authenticated
  using ((select auth.uid()) = user_id);

update public.profiles set bio = null where bio is not null;

create function public.move_profile_bio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := left(btrim(new.bio), 160);
begin
  if clean is not null and clean <> '' then
    insert into public.profile_bios (user_id, bio, updated_at)
    values (new.id, clean, now())
    on conflict (user_id) do update set bio = excluded.bio, updated_at = excluded.updated_at;
  end if;
  new.bio := null;
  return new;
end;
$$;

revoke execute on function public.move_profile_bio() from public, anon, authenticated;

create trigger move_profile_bio
  before insert or update of bio on public.profiles
  for each row execute function public.move_profile_bio();

create function public.update_my_profile(
  p_display_name text,
  p_bio text,
  p_avatar_url text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  me uuid := auth.uid();
  clean text := left(nullif(btrim(p_bio), ''), 160);
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  update public.profiles
    set display_name = p_display_name, avatar_url = coalesce(p_avatar_url, avatar_url)
    where id = me;
  if clean is null then
    delete from public.profile_bios where user_id = me;
  else
    insert into public.profile_bios (user_id, bio, updated_at)
    values (me, clean, now())
    on conflict (user_id) do update set bio = excluded.bio, updated_at = excluded.updated_at;
  end if;
end;
$$;

revoke execute on function public.update_my_profile(text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text) to authenticated;

create function public.attach_profile_bio_to_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update public.reports r
    set snapshot = left(coalesce(r.snapshot, '') || ' ' || b.bio, 1000)
    from public.profile_bios b
    where r.id = p_report_id
      and r.reporter_id = auth.uid()
      and r.target_type = 'profile'
      and b.user_id = r.target_id
      and right(coalesce(r.snapshot, ''), length(b.bio)) <> b.bio;
end;
$$;

revoke execute on function public.attach_profile_bio_to_report(uuid) from public, anon;
grant execute on function public.attach_profile_bio_to_report(uuid) to authenticated;

update storage.buckets set public = false where id = 'car-photos';

drop policy "car photos are publicly accessible" on storage.objects;

create policy "owner and friends read car photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'car-photos'
    and (
      public.owns_storage_folder(name)
      or public.is_friend((select auth.uid()), ((storage.foldername(name))[1])::uuid)
    )
  );

drop policy "cars are readable by everyone" on public.cars;

create policy "owner and friends read cars"
  on public.cars for select to authenticated
  using ((select auth.uid()) = owner_id or public.is_friend((select auth.uid()), owner_id));

CREATE OR REPLACE FUNCTION public.export_my_data() RETURNS jsonb
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
    'profile', (select to_jsonb(p) || jsonb_build_object('bio', (select b.bio from profile_bios b where b.user_id = me)) from profiles p where p.id = me),
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

CREATE OR REPLACE FUNCTION public.report_content(p_target_type text, p_target_id uuid, p_reason text, p_details text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  caller uuid := auth.uid();
  target_user uuid;
  target_text text;
  target_found boolean := false;
  new_report uuid;
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
    select id, display_name || ' (@' || username || ')'
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
  on conflict (reporter_id, target_type, target_id, md5(coalesce(snapshot, ''))) do nothing
  returning id into new_report;

  if new_report is not null and p_target_type = 'profile' then
    perform public.attach_profile_bio_to_report(new_report);
  end if;
end;
$$;
