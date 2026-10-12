begin;

select plan(9);

insert into auth.users (id) values
  ('6d000001-0000-0000-0000-000000000001'),
  ('6d000002-0000-0000-0000-000000000002'),
  ('6d000003-0000-0000-0000-000000000003');

insert into public.profiles (id, username, display_name) values
  ('6d000001-0000-0000-0000-000000000001', 'test-hard-alice', 'Alice'),
  ('6d000002-0000-0000-0000-000000000002', 'test-hard-bob', 'Bob'),
  ('6d000003-0000-0000-0000-000000000003', 'test-hard-carol', 'Carol')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('6d000001-0000-0000-0000-000000000001', '6d000002-0000-0000-0000-000000000002', 'accepted');

insert into public.meetups (id, creator_id, title, vibe, lat, lng, starts_at) values
  ('6d0000c1-0000-0000-0000-000000000001', '6d000001-0000-0000-0000-000000000001', 'Nu', 'hang', 59.3, 18.1, now()),
  ('6d0000c2-0000-0000-0000-000000000002', '6d000001-0000-0000-0000-000000000001', 'Nästa vecka', 'hang', 59.3, 18.1, now() + interval '7 days');

insert into public.meetup_interests (meetup_id, user_id) values
  ('6d0000c1-0000-0000-0000-000000000001', '6d000002-0000-0000-0000-000000000002');

set local role postgres;
create function public.hardening_probe() returns int language sql as 'select 1';
reset role;

select is(
  has_function_privilege('anon', 'public.hardening_probe()', 'execute'),
  false,
  'a new function is not executable by logged-out callers by default'
);

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('fuzz_location_before_write', 'set_status_expiry', 'set_spot_photo_expiry')
      and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')),
  0,
  'trigger functions have a fixed search_path'
);

set local role anon;

select throws_ok(
  $$select public.meetup_interest_count('6d0000c1-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'a logged-out caller cannot read meetup counts'
);

set local role authenticated;
set local request.jwt.claim.sub = '6d000003-0000-0000-0000-000000000003';

select is(
  public.meetup_interest_count('6d0000c1-0000-0000-0000-000000000001')::int,
  0,
  'a stranger gets no interest count for a meetup they cannot see'
);

select throws_ok(
  $$select public.check_in_at_meetup('6d0000c1-0000-0000-0000-000000000001', 59.3, 18.1)$$,
  'P0001',
  'Träffen hittades inte.',
  'a stranger cannot check in at a meetup they cannot see'
);

set local request.jwt.claim.sub = '6d000002-0000-0000-0000-000000000002';

select is(
  public.meetup_interest_count('6d0000c1-0000-0000-0000-000000000001')::int,
  1,
  'a friend sees the interest count'
);

select is(
  public.check_in_at_meetup('6d0000c2-0000-0000-0000-000000000002', 59.3, 18.1),
  false,
  'a friend cannot check in at a meetup that is days away'
);

select is(
  public.check_in_at_meetup('6d0000c1-0000-0000-0000-000000000001', 59.3, 18.1),
  true,
  'a friend at the place during the meetup checks in'
);

set local request.jwt.claim.sub = '6d000001-0000-0000-0000-000000000001';

select is(
  public.meetup_here_now_count('6d0000c1-0000-0000-0000-000000000001')::int,
  1,
  'the owner sees how many are there now'
);

select * from finish();

rollback;
