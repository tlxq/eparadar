begin;

select plan(4);

insert into auth.users (id) values
  ('a2000000-0000-0000-0000-000000000001'),
  ('b2000000-0000-0000-0000-000000000002');

insert into public.profiles (id, username, display_name) values
  ('a2000000-0000-0000-0000-000000000001', 'test-analytics-alice', 'Alice'),
  ('b2000000-0000-0000-0000-000000000002', 'test-analytics-bob', 'Bob')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

set local role authenticated;
set local request.jwt.claim.sub = 'a2000000-0000-0000-0000-000000000001';

select lives_ok(
  $$insert into public.analytics_events (user_id, event_name) values ('a2000000-0000-0000-0000-000000000001', 'app_opened')$$,
  'a user can record an event with their own user_id'
);

select lives_ok(
  $$insert into public.analytics_events (user_id, event_name) values (null, 'app_opened')$$,
  'a user can record an event with a null (anonymous) user_id'
);

select throws_ok(
  $$insert into public.analytics_events (user_id, event_name) values ('b2000000-0000-0000-0000-000000000002', 'app_opened')$$,
  'new row violates row-level security policy for table "analytics_events"',
  'a user cannot record an event claiming someone else as user_id'
);

select is(
  (select count(*)::int from public.analytics_events),
  0,
  'no select policy exists, so events are invisible to regular users even though rows exist'
);

select * from finish();

rollback;
