begin;

select plan(20);

insert into auth.users (id) values
  ('ab000001-0000-0000-0000-000000000001'),
  ('ab000002-0000-0000-0000-000000000002'),
  ('ab000003-0000-0000-0000-000000000003'),
  ('ab000004-0000-0000-0000-000000000004');

insert into public.profiles (id, username, display_name) values
  ('ab000001-0000-0000-0000-000000000001', 'test-auth-alice', 'Alice'),
  ('ab000002-0000-0000-0000-000000000002', 'test-auth-bob', 'Bob'),
  ('ab000003-0000-0000-0000-000000000003', 'test-auth-carol', 'Carol'),
  ('ab000004-0000-0000-0000-000000000004', 'test-auth-dave', 'Dave')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('ab000001-0000-0000-0000-000000000001', 'ab000002-0000-0000-0000-000000000002', 'accepted');

insert into public.cars (owner_id, make, model) values
  ('ab000001-0000-0000-0000-000000000001', 'Volvo', '740');

insert into public.meetups (id, creator_id, title, vibe, lat, lng, starts_at) values
  ('ab0000aa-0000-0000-0000-000000000001', 'ab000003-0000-0000-0000-000000000003', 'Macken', 'hang', 59.3, 18.1, now() + interval '1 hour');

insert into public.meetup_interests (meetup_id, user_id) values
  ('ab0000aa-0000-0000-0000-000000000001', 'ab000001-0000-0000-0000-000000000001');

insert into public.meetup_checkins (meetup_id, user_id) values
  ('ab0000aa-0000-0000-0000-000000000001', 'ab000001-0000-0000-0000-000000000001');

insert into public.posts (id, author_id, body) values
  ('ab0000bb-0000-0000-0000-000000000001', 'ab000001-0000-0000-0000-000000000001', 'Ny lack');

insert into public.likes (post_id, user_id) values
  ('ab0000bb-0000-0000-0000-000000000001', 'ab000001-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public'
      and roles <> '{authenticated}'
      and not (tablename = 'analytics_events' and cmd = 'INSERT')),
  0,
  'every policy in public is scoped to authenticated, except the analytics insert'
);

set local role anon;

select is(
  (select count(*)::int from public.profiles),
  0,
  'a logged-out caller reads no profiles'
);

select is(
  (select count(*)::int from public.cars),
  0,
  'a logged-out caller reads no cars'
);

select is(
  (select count(*)::int from public.meetups),
  0,
  'a logged-out caller reads no meetups'
);

select is(
  (select count(*)::int from public.meetup_interests),
  0,
  'a logged-out caller reads no meetup interest'
);

select is(
  (select count(*)::int from public.meetup_checkins),
  0,
  'a logged-out caller reads no check-ins'
);

select is(
  (select count(*)::int from public.likes),
  0,
  'a logged-out caller reads no likes'
);

select throws_ok(
  'select count(*) from public.meetups_with_stats',
  '42501',
  null,
  'a logged-out caller cannot read the meetup stats view'
);

select throws_ok(
  $$ select public.meetup_here_now_count('ab0000aa-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'a logged-out caller cannot ask how many are at a meetup'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'ab000004-0000-0000-0000-000000000004';

select is(
  (select count(*)::int from public.profiles where username like 'test-auth-%'),
  4,
  'a logged-in stranger still sees profiles'
);

select is(
  (select count(*)::int from public.meetup_interests
    where meetup_id = 'ab0000aa-0000-0000-0000-000000000001'),
  0,
  'a stranger does not see who is interested in a meetup'
);

select is(
  (select count(*)::int from public.meetup_checkins
    where meetup_id = 'ab0000aa-0000-0000-0000-000000000001'),
  0,
  'a stranger does not see who checked in at a meetup'
);

select is(
  (select count(*)::int from public.meetups_with_stats
    where id = 'ab0000aa-0000-0000-0000-000000000001'),
  0,
  'a stranger does not see a meetup from a non-friend'
);

select is(
  (select here_now_count::int from public.meetups_with_stats
    where id = 'ab0000aa-0000-0000-0000-000000000001'),
  null,
  'a stranger gets no here-now count for a meetup they cannot see'
);

select is(
  (select count(*)::int from public.likes
    where post_id = 'ab0000bb-0000-0000-0000-000000000001'),
  0,
  'a stranger does not see likes on a post they cannot read'
);

set local request.jwt.claim.sub = 'ab000003-0000-0000-0000-000000000003';

select is(
  (select count(*)::int from public.meetup_interests
    where meetup_id = 'ab0000aa-0000-0000-0000-000000000001'),
  1,
  'the meetup creator sees who is interested in their meetup'
);

select is(
  (select count(*)::int from public.meetup_checkins
    where meetup_id = 'ab0000aa-0000-0000-0000-000000000001'),
  0,
  'the meetup creator does not see check-ins from people who are not friends'
);

set local request.jwt.claim.sub = 'ab000002-0000-0000-0000-000000000002';

select is(
  (select count(*)::int from public.meetup_checkins
    where meetup_id = 'ab0000aa-0000-0000-0000-000000000001'),
  1,
  'a friend sees the check-in'
);

select is(
  (select count(*)::int from public.likes
    where post_id = 'ab0000bb-0000-0000-0000-000000000001'),
  1,
  'a friend sees likes on a post they can read'
);

set local request.jwt.claim.sub = 'ab000001-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.meetup_checkins
    where meetup_id = 'ab0000aa-0000-0000-0000-000000000001'),
  1,
  'the owner sees their own check-in'
);

select * from finish();

rollback;
