begin;

select plan(6);

select tests.create_user('3c000001-0000-0000-0000-000000000001', 'test-exp-data-alice', 'Alice');
select tests.create_user('3c000002-0000-0000-0000-000000000002', 'test-exp-data-bob', 'Bob');
select tests.create_user('3c000003-0000-0000-0000-000000000003', 'test-exp-data-carol', 'Carol');

insert into public.friendships (requester_id, addressee_id, status) values
  ('3c000001-0000-0000-0000-000000000001', '3c000002-0000-0000-0000-000000000002', 'accepted');

insert into public.posts (author_id, body) values
  ('3c000001-0000-0000-0000-000000000001', 'Alices inlägg'),
  ('3c000002-0000-0000-0000-000000000002', 'Bobs inlägg');

select tests.login_anon();

select throws_ok('select public.export_my_data()', '42501', null, 'a logged-out caller cannot export');

select tests.login_as('3c000003-0000-0000-0000-000000000003');

select is(
  jsonb_array_length(public.export_my_data() -> 'posts'),
  0,
  'a stranger''s export holds none of Alice''s posts'
);

select tests.login_as('3c000002-0000-0000-0000-000000000002');

select is(
  (public.export_my_data() -> 'posts' -> 0 ->> 'body'),
  'Bobs inlägg',
  'a friend''s export holds only their own post'
);

select tests.login_as('3c000001-0000-0000-0000-000000000001');

select is(
  (public.export_my_data() -> 'profile' ->> 'username'),
  'test-exp-data-alice',
  'the owner''s export holds their profile'
);

select is(
  jsonb_array_length(public.export_my_data() -> 'posts'),
  1,
  'the owner''s export holds their own posts only'
);

select is(
  (public.export_my_data() -> 'friendships' -> 0 ->> 'with_user_id'),
  '3c000002-0000-0000-0000-000000000002',
  'the owner''s export lists their friendships'
);

select * from finish();

rollback;
