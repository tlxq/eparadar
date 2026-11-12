begin;

select plan(20);

select tests.create_user('ab000001-0000-0000-0000-000000000001', 'test-auth-alice', 'Alice');
select tests.create_user('ab000002-0000-0000-0000-000000000002', 'test-auth-bob', 'Bob');
select tests.create_user('ab000003-0000-0000-0000-000000000003', 'test-auth-carol', 'Carol');
select tests.create_user('ab000004-0000-0000-0000-000000000004', 'test-auth-dave', 'Dave');

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

insert into public.post_reactions (post_id, user_id, emoji) values
  ('ab0000bb-0000-0000-0000-000000000001', 'ab000001-0000-0000-0000-000000000001', '🔥');

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public'
      and roles <> '{authenticated}'
      and not (tablename = 'analytics_events' and cmd = 'INSERT')),
  0,
  'every policy in public is scoped to authenticated, except the analytics insert'
);

select tests.login_anon();

select throws_ok(
  $$select count(*) from public.profiles$$,
  '42501',
  null,
  'a logged-out caller reads no profiles'
);

select throws_ok(
  $$select count(*) from public.cars$$,
  '42501',
  null,
  'a logged-out caller reads no cars'
);

select throws_ok(
  $$select count(*) from public.meetups$$,
  '42501',
  null,
  'a logged-out caller reads no meetups'
);

select throws_ok(
  $$select count(*) from public.meetup_interests$$,
  '42501',
  null,
  'a logged-out caller reads no meetup interest'
);

select throws_ok(
  $$select count(*) from public.meetup_checkins$$,
  '42501',
  null,
  'a logged-out caller reads no check-ins'
);

select throws_ok(
  $$select count(*) from public.post_reactions$$,
  '42501',
  null,
  'a logged-out caller reads no reactions'
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

select tests.logout();
select tests.login_as('ab000004-0000-0000-0000-000000000004');

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
  (select count(*)::int from public.post_reactions
    where post_id = 'ab0000bb-0000-0000-0000-000000000001'),
  0,
  'a stranger does not see reactions on a post they cannot read'
);

select tests.login_as('ab000003-0000-0000-0000-000000000003');

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

select tests.login_as('ab000002-0000-0000-0000-000000000002');

select is(
  (select count(*)::int from public.meetup_checkins
    where meetup_id = 'ab0000aa-0000-0000-0000-000000000001'),
  1,
  'a friend sees the check-in'
);

select is(
  (select count(*)::int from public.post_reactions
    where post_id = 'ab0000bb-0000-0000-0000-000000000001'),
  1,
  'a friend sees reactions on a post they can read'
);

select tests.login_as('ab000001-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.meetup_checkins
    where meetup_id = 'ab0000aa-0000-0000-0000-000000000001'),
  1,
  'the owner sees their own check-in'
);

select * from finish();

rollback;
