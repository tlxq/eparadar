begin;

select plan(10);

select tests.create_user('69000001-0000-0000-0000-000000000001', 'test-mf-me', 'MfMe');
select tests.create_user('69000002-0000-0000-0000-000000000001', 'test-mf-target', 'MfTarget');
select tests.create_user('69000003-0000-0000-0000-000000000001', 'test-mf-mutual', 'MfMutual');
select tests.create_user('69000004-0000-0000-0000-000000000001', 'test-mf-stranger', 'MfStranger');
select tests.create_user('69000005-0000-0000-0000-000000000001', 'test-mf-theirs', 'MfTheirs');

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

select tests.login_anon();

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

select tests.login_as('69000004-0000-0000-0000-000000000001');

select is(
  (select count(*) from public.mutual_friends('69000002-0000-0000-0000-000000000001')),
  0::bigint,
  'a stranger gets no mutual friends'
);

select is(
  (select count(*) from public.cars where owner_id = '69000002-0000-0000-0000-000000000001'),
  0::bigint,
  'a stranger cannot see the EPAs on a profile'
);

select is(
  (select count(*) from public.posts where author_id = '69000002-0000-0000-0000-000000000001'),
  0::bigint,
  'a stranger cannot see the posts on a profile'
);

select tests.login_as('69000001-0000-0000-0000-000000000001');

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

select tests.login_as('69000002-0000-0000-0000-000000000001');

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
