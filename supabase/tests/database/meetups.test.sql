begin;

select plan(12);

insert into auth.users (id) values
  ('d9000000-0000-0000-0000-000000000021'),
  ('e9000000-0000-0000-0000-000000000022'),
  ('c9000000-0000-0000-0000-000000000023');

insert into public.profiles (id, username, display_name) values
  ('d9000000-0000-0000-0000-000000000021', 'test-meetup-alice', 'Alice'),
  ('e9000000-0000-0000-0000-000000000022', 'test-meetup-bob', 'Bob'),
  ('c9000000-0000-0000-0000-000000000023', 'test-meetup-carol', 'Carol')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.meetups (id, creator_id, title, vibe, lat, lng, starts_at) values
  ('f2000000-0000-0000-0000-000000000001', 'd9000000-0000-0000-0000-000000000021', 'Cruising', 'cruising', 59.3000, 18.1000, now() + interval '1 day'),
  ('f2000000-0000-0000-0000-000000000002', 'd9000000-0000-0000-0000-000000000021', 'Throwaway', 'hang', 59.4000, 18.2000, now() + interval '1 day');

set local role authenticated;
set local request.jwt.claim.sub = 'e9000000-0000-0000-0000-000000000022';

select is(
  (select count(*)::int from public.meetups where id = 'f2000000-0000-0000-0000-000000000001'),
  1,
  'anyone (not just the creator) can view a meetup'
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

set local request.jwt.claim.sub = 'c9000000-0000-0000-0000-000000000023';

select is(
  (select count(*)::int from public.meetup_interests where meetup_id = 'f2000000-0000-0000-0000-000000000001'),
  1,
  'interest rows are visible to any authenticated user, not just participants'
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
