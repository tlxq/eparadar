create table post_places (
  post_id uuid primary key references posts on delete cascade,
  author_id uuid not null references profiles on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index post_places_author_id_idx on post_places (author_id);
create index post_places_expires_at_idx on post_places (expires_at);

alter table post_places enable row level security;

create policy "owner and kompisar see live post places"
  on post_places for select to authenticated
  using (
    expires_at > now()
    and (author_id = auth.uid() or is_friend(auth.uid(), author_id))
  );

create policy "authors drop their new posts on the map"
  on post_places for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from posts p
      where p.id = post_places.post_id
        and p.author_id = auth.uid()
        and p.created_at > now() - interval '1 hour'
    )
  );

create policy "authors remove their post places"
  on post_places for delete to authenticated
  using (author_id = auth.uid());

create or replace function set_post_place_expiry()
returns trigger
language plpgsql
set search_path = public
as $$
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

revoke execute on function public.set_post_place_expiry() from public, anon, authenticated;

create trigger post_places_set_expiry
  before insert on post_places
  for each row
  execute function set_post_place_expiry();

create or replace function public.purge_expired_post_places()
returns void
language sql
security definer
set search_path = public
as $$
  delete from post_places where expires_at < now();
$$;

revoke execute on function public.purge_expired_post_places() from public, anon, authenticated;

select cron.schedule(
  'purge-expired-post-places',
  '*/10 * * * *',
  'select public.purge_expired_post_places();'
);

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
    'messages_sent', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.created_at) from messages m where m.sender_id = me
    ), '[]'::jsonb),
    'location', (select to_jsonb(l) from locations l where l.user_id = me),
    'spots', coalesce((select jsonb_agg(to_jsonb(s)) from spots s where s.creator_id = me), '[]'::jsonb),
    'spot_photos', coalesce((select jsonb_agg(to_jsonb(s)) from spot_photos s where s.author_id = me), '[]'::jsonb),
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
