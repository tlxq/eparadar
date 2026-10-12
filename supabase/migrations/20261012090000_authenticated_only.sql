drop policy "anyone can view interest" on meetup_interests;

create policy "own, friends' and own meetups' interest is visible"
  on meetup_interests for select to authenticated
  using (
    user_id = auth.uid()
    or is_friend(auth.uid(), user_id)
    or exists (
      select 1 from meetups m
      where m.id = meetup_interests.meetup_id and m.creator_id = auth.uid()
    )
  );

drop policy "anyone can view checkins" on meetup_checkins;

create policy "own and friends' checkins are visible"
  on meetup_checkins for select to authenticated
  using (user_id = auth.uid() or is_friend(auth.uid(), user_id));

drop policy "likes are readable by everyone" on likes;

create policy "likes on visible posts are readable"
  on likes for select to authenticated
  using (exists (select 1 from posts p where p.id = likes.post_id));

do $$
declare
  p record;
begin
  for p in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and roles = '{public}'
      and not (tablename = 'analytics_events' and cmd = 'INSERT')
  loop
    execute format('alter policy %I on public.%I to authenticated', p.policyname, p.tablename);
  end loop;
end;
$$;

create function public.meetup_interest_count(p_meetup_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from meetup_interests
  where meetup_id = p_meetup_id and auth.uid() is not null;
$$;

revoke execute on function public.meetup_interest_count(uuid) from public, anon;
grant execute on function public.meetup_interest_count(uuid) to authenticated;

create function public.meetup_here_now_count(p_meetup_id uuid)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from meetup_checkins
  where meetup_id = p_meetup_id
    and checked_in_at > now() - interval '30 minutes'
    and auth.uid() is not null;
$$;

revoke execute on function public.meetup_here_now_count(uuid) from public, anon;
grant execute on function public.meetup_here_now_count(uuid) to authenticated;

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
