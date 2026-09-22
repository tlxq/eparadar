begin;

select plan(6);

insert into auth.users (id) values
  ('c3000000-0000-0000-0000-000000000001'),
  ('d3000000-0000-0000-0000-000000000002');

insert into public.profiles (id, username, display_name) values
  ('c3000000-0000-0000-0000-000000000001', 'test-push-alice', 'Alice'),
  ('d3000000-0000-0000-0000-000000000002', 'test-push-bob', 'Bob')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

set local role authenticated;
set local request.jwt.claim.sub = 'c3000000-0000-0000-0000-000000000001';

select lives_ok(
  $$insert into public.push_tokens (user_id, token, platform) values ('c3000000-0000-0000-0000-000000000001', 'expo-token-a', 'android')$$,
  'a user can register their own push token'
);

select throws_ok(
  $$insert into public.push_tokens (user_id, token, platform) values ('d3000000-0000-0000-0000-000000000002', 'expo-token-hijack', 'android')$$,
  'new row violates row-level security policy for table "push_tokens"',
  'a user cannot register a push token claiming someone else as user_id'
);

select throws_ok(
  $$insert into public.push_tokens (user_id, token, platform) values ('c3000000-0000-0000-0000-000000000001', 'expo-token-b', 'desktop')$$,
  'new row for relation "push_tokens" violates check constraint "push_tokens_platform_check"',
  'platform is constrained to ios/android/web'
);

select is(
  (select count(*)::int from public.push_tokens),
  1,
  'the owner sees exactly their own token'
);

select lives_ok(
  $$insert into public.push_tokens (user_id, token, platform) values ('c3000000-0000-0000-0000-000000000001', 'expo-token-a', 'android') on conflict (user_id, token) do update set platform = excluded.platform$$,
  're-registering the same token on a later login (upsert on conflict) does not violate RLS'
);

set local request.jwt.claim.sub = 'd3000000-0000-0000-0000-000000000002';

select is(
  (select count(*)::int from public.push_tokens),
  0,
  'another user sees zero rows, not the first user''s token'
);

select * from finish();

rollback;
