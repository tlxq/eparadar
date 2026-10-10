alter table meetups
  add column vibe text not null default 'cruising'
  check (vibe in ('cruising', 'hang', 'fest', 'kak'));

update meetups set vibe = case vibe_emoji
  when '🔥' then 'hang'
  when '🎉' then 'fest'
  when '🍕' then 'kak'
  else 'cruising'
end;

drop view public.meetups_with_stats;

alter table meetups drop column vibe_emoji;

create view public.meetups_with_stats
with (security_invoker = true)
as
select
  m.*,
  coalesce(i.interest_count, 0) as interest_count,
  coalesce(c.here_now_count, 0) as here_now_count
from meetups m
left join (
  select meetup_id, count(*) as interest_count
  from meetup_interests
  group by meetup_id
) i on i.meetup_id = m.id
left join (
  select meetup_id, count(*) as here_now_count
  from meetup_checkins
  where checked_in_at > now() - interval '30 minutes'
  group by meetup_id
) c on c.meetup_id = m.id;

grant select on public.meetups_with_stats to authenticated;
