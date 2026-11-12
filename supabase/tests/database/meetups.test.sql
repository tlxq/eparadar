begin;

select plan(12);

select tests.create_user('d9000000-0000-0000-0000-000000000021', 'test-meetup-alice', 'Alice');
select tests.create_user('e9000000-0000-0000-0000-000000000022', 'test-meetup-bob', 'Bob');
select tests.create_user('c9000000-0000-0000-0000-000000000023', 'test-meetup-carol', 'Carol');

insert into public.meetups (id, creator_id, title, vibe, lat, lng, starts_at) values
  ('f2000000-0000-0000-0000-000000000001', 'd9000000-0000-0000-0000-000000000021', 'Cruising', 'cruising', 59.3000, 18.1000, now()),
  ('f2000000-0000-0000-0000-000000000002', 'd9000000-0000-0000-0000-000000000021', 'Throwaway', 'hang', 59.4000, 18.2000, now() + interval '1 day');

insert into public.friendships (requester_id, addressee_id, status) values
  ('d9000000-0000-0000-0000-000000000021', 'c9000000-0000-0000-0000-000000000023', 'accepted');

select tests.login_as('e9000000-0000-0000-0000-000000000022');

select is(
  (select count(*)::int from public.meetups where id = 'f2000000-0000-0000-0000-000000000001'),
  0,
  'a non-friend cannot view a meetup'
);

select throws_ok(
  'insert into public.meetups (creator_id, title, vibe, lat, lng, starts_at) values (''d9000000-0000-0000-0000-000000000021'', ''Fake'', ''fest'', 59.0, 18.0, now())',
  'new row violates row-level security policy for table "meetups"',
  'a user cannot create a meetup claiming someone else as creator_id'
);

with upd as (
  update public.meetups set title = 'Hacked' where id = 'f2000000-0000-0000-0000-000000000001' returning 1
)
select is(
  (select count(*)::int from upd),
  0,
  'a non-creator update affects zero rows'
);

with del as (
  delete from public.meetups where id = 'f2000000-0000-0000-0000-000000000002' returning 1
)
select is(
  (select count(*)::int from del),
  0,
  'a non-creator delete affects zero rows'
);

select lives_ok(
  'insert into public.meetup_interests (meetup_id, user_id) values (''f2000000-0000-0000-0000-000000000001'', ''e9000000-0000-0000-0000-000000000022'')',
  'a user can mark their own interest'
);

select throws_ok(
  'insert into public.meetup_interests (meetup_id, user_id) values (''f2000000-0000-0000-0000-000000000001'', ''c9000000-0000-0000-0000-000000000023'')',
  'new row violates row-level security policy for table "meetup_interests"',
  'a user cannot mark interest on someone else''s behalf'
);

select tests.login_as('c9000000-0000-0000-0000-000000000023');

select is(
  (select count(*)::int from public.meetup_interests where meetup_id = 'f2000000-0000-0000-0000-000000000001'),
  0,
  'interest rows are hidden from a user who is neither a friend nor the creator'
);

select throws_ok(
  'insert into public.meetup_checkins (meetup_id, user_id) values (''f2000000-0000-0000-0000-000000000001'', ''c9000000-0000-0000-0000-000000000023'')',
  'new row violates row-level security policy for table "meetup_checkins"',
  'meetup_checkins has no direct insert policy'
);

select is(
  public.check_in_at_meetup('f2000000-0000-0000-0000-000000000001', 59.30045, 18.1000),
  true,
  'checking in within ~50m of the meetup succeeds'
);

select is(
  public.check_in_at_meetup('f2000000-0000-0000-0000-000000000001', 59.3050, 18.1000),
  false,
  'checking in from ~550m away is rejected'
);

select is(
  public.check_in_at_meetup('f2000000-0000-0000-0000-000000000001', 59.30045, 18.1000),
  true,
  'checking in again while already checked in still succeeds'
);

select is(
  (select count(*)::int from public.meetup_checkins
    where meetup_id = 'f2000000-0000-0000-0000-000000000001'
      and user_id = 'c9000000-0000-0000-0000-000000000023'),
  1,
  'the repeated check-in updated the existing row instead of creating a second one'
);

select * from finish();

rollback;
