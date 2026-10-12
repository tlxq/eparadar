begin;

select plan(10);

insert into auth.users (id, raw_user_meta_data) values
  ('a9000001-0000-0000-0000-000000000001', '{"username": "test-age-alice", "display_name": "Alice", "birth_year": "2008"}'),
  ('a9000002-0000-0000-0000-000000000002', null),
  ('a9000003-0000-0000-0000-000000000003', null);

insert into public.profiles (id, username, display_name) values
  ('a9000002-0000-0000-0000-000000000002', 'test-age-bob', 'Bob'),
  ('a9000003-0000-0000-0000-000000000003', 'test-age-carol', 'Carol')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('a9000001-0000-0000-0000-000000000001', 'a9000002-0000-0000-0000-000000000002', 'accepted');

select is(
  (select birth_year::int from public.user_ages where user_id = 'a9000001-0000-0000-0000-000000000001'),
  2008,
  'sign-up stores the birth year'
);

select throws_ok(
  $$insert into auth.users (id, raw_user_meta_data) values
    ('a9000004-0000-0000-0000-000000000004', '{"username": "test-age-young", "display_name": "Ung", "birth_year": "2016"}')$$,
  '23514',
  'Du måste vara minst 15 år för att använda epaRadar.',
  'sign-up under 15 is refused'
);

select throws_ok(
  $$insert into auth.users (id, raw_user_meta_data) values
    ('a9000005-0000-0000-0000-000000000005', '{"username": "test-age-none", "display_name": "Ingen"}')$$,
  'P0001',
  'Fyll i ditt födelseår.',
  'sign-up from the app without a birth year is refused'
);

set local role anon;

select is((select count(*)::int from public.user_ages), 0, 'a logged-out caller reads no birth years');

set local role authenticated;
set local request.jwt.claim.sub = 'a9000003-0000-0000-0000-000000000003';

select is((select count(*)::int from public.user_ages), 0, 'a stranger reads no birth years');

select throws_ok(
  $$insert into public.user_ages (user_id, birth_year) values ('a9000001-0000-0000-0000-000000000001', 1990)$$,
  '42501',
  null,
  'nobody can set someone else''s birth year'
);

set local request.jwt.claim.sub = 'a9000002-0000-0000-0000-000000000002';

select is((select count(*)::int from public.user_ages), 0, 'a friend cannot read a birth year');

select lives_ok(
  $$insert into public.user_ages (user_id, birth_year) values ('a9000002-0000-0000-0000-000000000002', 2009)$$,
  'an existing user without a birth year can add one'
);

set local request.jwt.claim.sub = 'a9000001-0000-0000-0000-000000000001';

select is((select birth_year::int from public.user_ages), 2008, 'the owner reads their own birth year');

select throws_ok(
  $$update public.user_ages set birth_year = 1990$$,
  '42501',
  null,
  'a birth year cannot be changed afterwards'
);

select * from finish();

rollback;
