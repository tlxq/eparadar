create table spot_votes (
  spot_id uuid not null references spots on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  gone boolean not null,
  created_at timestamptz not null default now(),
  primary key (spot_id, user_id)
);

create index spot_votes_user_id_idx on spot_votes (user_id);

alter table spot_votes enable row level security;

create policy "people see their own votes on live warnings"
  on spot_votes for select to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from spots s where s.id = spot_votes.spot_id)
  );

create or replace function public.vote_on_warning(p_spot_id uuid, p_gone boolean)
returns table (still_there integer, gone integer, cleared boolean)
language plpgsql
security definer
set search_path = public
as $$
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

revoke execute on function public.vote_on_warning(uuid, boolean) from public, anon;
grant execute on function public.vote_on_warning(uuid, boolean) to authenticated;

create or replace function public.warning_votes(p_spot_id uuid)
returns table (still_there integer, gone integer, my_vote boolean)
language plpgsql
security definer
stable
set search_path = public
as $$
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

revoke execute on function public.warning_votes(uuid) from public, anon;
grant execute on function public.warning_votes(uuid) to authenticated;

alter table meetups
  add column description text check (char_length(description) <= 300);

alter table meetups
  add constraint meetups_title_length check (char_length(btrim(title)) between 1 and 60) not valid;

drop policy "creator updates their meetup" on meetups;

create policy "creator updates their meetup"
  on meetups for update to authenticated
  using (auth.uid() = creator_id)
  with check (
    auth.uid() = creator_id
    and starts_at > now() - interval '1 day'
    and starts_at < now() + interval '60 days'
    and lat between -90 and 90
    and lng between -180 and 180
  );

create or replace function public.keep_meetup_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.id := old.id;
  new.creator_id := old.creator_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

revoke execute on function public.keep_meetup_identity() from public, anon, authenticated;

create trigger meetups_keep_identity
  before update on meetups
  for each row
  execute function keep_meetup_identity();

drop view public.meetups_with_stats;

create view public.meetups_with_stats
with (security_invoker = true)
as
select
  m.*,
  public.meetup_interest_count(m.id) as interest_count,
  public.meetup_here_now_count(m.id) as here_now_count
from meetups m;

revoke all on public.meetups_with_stats from public, anon;
grant select on public.meetups_with_stats to authenticated;

alter table messages
  add column meetup_id uuid references meetups on delete set null;

create index messages_meetup_id_idx on messages (meetup_id) where meetup_id is not null;

create policy "shared meetups must be visible to the sender"
  on messages as restrictive for insert to authenticated
  with check (
    meetup_id is null
    or exists (select 1 from meetups m where m.id = messages.meetup_id)
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
