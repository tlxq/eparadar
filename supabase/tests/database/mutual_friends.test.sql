begin;

select plan(10);

insert into auth.users (id) values
  ('69000001-0000-0000-0000-000000000001'),
  ('69000002-0000-0000-0000-000000000001'),
  ('69000003-0000-0000-0000-000000000001'),
  ('69000004-0000-0000-0000-000000000001'),
  ('69000005-0000-0000-0000-000000000001');

insert into public.profiles (id, username, display_name) values
  ('69000001-0000-0000-0000-000000000001', 'test-mf-me', 'MfMe'),
  ('69000002-0000-0000-0000-000000000001', 'test-mf-target', 'MfTarget'),
  ('69000003-0000-0000-0000-000000000001', 'test-mf-mutual', 'MfMutual'),
  ('69000004-0000-0000-0000-000000000001', 'test-mf-stranger', 'MfStranger'),
  ('69000005-0000-0000-0000-000000000001', 'test-mf-theirs', 'MfTheirs')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('69000001-0000-0000-0000-000000000001', '69000002-0000-0000-0000-000000000001', 'accepted'),
  ('69000001-0000-0000-0000-000000000001', '69000003-0000-0000-0000-000000000001', 'accepted'),
  ('69000003-0000-0000-0000-000000000001', '69000002-0000-0000-0000-000000000001', 'accepted'),
  ('69000005-0000-0000-0000-000000000001', '69000002-0000-0000-0000-000000000001', 'accepted'),
  ('69000004-0000-0000-0000-000000000001', '69000003-0000-0000-0000-000000000001', 'accepted');

insert into public.cars (owner_id, make, model) values
  ('69000002-0000-0000-0000-000000000001', 'Volvo', '240');

insert into public.posts (author_id, body) values
  ('69000002-0000-0000-0000-000000000001', 'mf target post');

set local role anon;

select throws_ok(
  $$ select * from public.mutual_friends('69000002-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'logged out cannot call mutual_friends'
);

set local role authenticated;
set local request.jwt.claim.sub = '';

select throws_ok(
  $$ select * from public.mutual_friends('69000002-0000-0000-0000-000000000001') $$,
  'P0001',
  'Du måste vara inloggad.',
  'a caller without a user id is refused'
);

set local request.jwt.claim.sub = '69000004-0000-0000-0000-000000000001';

select is(
  (select count(*) from public.mutual_friends('69000002-0000-0000-0000-000000000001')),
  0::bigint,
  'a stranger gets no mutual friends'
);

select is(
  (select count(*) from public.cars where owner_id = '69000002-0000-0000-0000-000000000001'),
  1::bigint,
  'a stranger can see the EPAs on a profile'
);

select is(
  (select count(*) from public.posts where author_id = '69000002-0000-0000-0000-000000000001'),
  0::bigint,
  'a stranger cannot see the posts on a profile'
);

set local request.jwt.claim.sub = '69000001-0000-0000-0000-000000000001';

select results_eq(
  $$ select id from public.mutual_friends('69000002-0000-0000-0000-000000000001') $$,
  $$ values ('69000003-0000-0000-0000-000000000001'::uuid) $$,
  'a friend gets only the shared friends'
);

select is(
  (select count(*) from public.posts where author_id = '69000002-0000-0000-0000-000000000001'),
  1::bigint,
  'a friend can see the posts on a profile'
);

select is(
  (select count(*) from public.mutual_friends('69000001-0000-0000-0000-000000000001')),
  0::bigint,
  'asking for yourself returns nothing'
);

set local request.jwt.claim.sub = '69000002-0000-0000-0000-000000000001';

select is(
  (select count(*) from public.mutual_friends('69000002-0000-0000-0000-000000000001')),
  0::bigint,
  'the owner asking about themselves gets nothing'
);

select results_eq(
  $$ select id from public.mutual_friends('69000001-0000-0000-0000-000000000001') $$,
  $$ values ('69000003-0000-0000-0000-000000000001'::uuid) $$,
  'it works both ways between friends'
);

select * from finish();

rollback;
