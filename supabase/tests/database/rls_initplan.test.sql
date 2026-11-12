begin;

select plan(7);

select is(
  (select count(*)::int from pg_policies
   where schemaname in ('public', 'storage')
     and regexp_replace(
           coalesce(qual, '') || ' ' || coalesce(with_check, ''),
           '\(\s*select\s+auth\.uid\(\)(\s+as\s+\w+)?\s*\)', '', 'gi'
         ) ~* 'auth\.uid\(\)'),
  0,
  'no policy calls auth.uid() outside a select'
);

select ok(
  (select count(*) from pg_policies
   where schemaname = 'public' and qual ~* 'select\s+auth\.uid\(\)') > 0,
  'public policies use the wrapped form'
);

select tests.create_user('ff000001-0000-0000-0000-000000000001', 'test-ip-me', 'IpMe');
select tests.create_user('ff000002-0000-0000-0000-000000000001', 'test-ip-friend', 'IpFriend');
select tests.create_user('ff000003-0000-0000-0000-000000000001', 'test-ip-stranger', 'IpStranger');

insert into public.friendships (requester_id, addressee_id, status) values
  ('ff000001-0000-0000-0000-000000000001', 'ff000002-0000-0000-0000-000000000001', 'accepted');

insert into public.posts (author_id, body) values
  ('ff000001-0000-0000-0000-000000000001', 'ip own post'),
  ('ff000002-0000-0000-0000-000000000001', 'ip friend post'),
  ('ff000003-0000-0000-0000-000000000001', 'ip stranger post');

select tests.login_as('ff000001-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.posts where body like 'ip %'),
  2,
  'sees own and friend posts'
);

select is(
  (select count(*)::int from public.posts where body = 'ip stranger post'),
  0,
  'does not see a non-friend post'
);

select throws_ok(
  $$ insert into public.posts (author_id, body)
     values ('ff000003-0000-0000-0000-000000000001', 'ip forged') $$,
  '42501',
  null,
  'cannot post as someone else'
);

select tests.login_anon();

select throws_ok(
  $$select count(*) from public.posts$$,
  '42501',
  null,
  'logged-out user sees no posts'
);

select throws_ok(
  $$ insert into public.posts (author_id, body)
     values ('ff000001-0000-0000-0000-000000000001', 'ip anon') $$,
  '42501',
  null,
  'logged-out user cannot post'
);

select * from finish();
rollback;
