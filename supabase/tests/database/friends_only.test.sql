begin;

select plan(10);

insert into auth.users (id) values
  ('fe000001-0000-0000-0000-000000000001'),
  ('fe000002-0000-0000-0000-000000000001'),
  ('fe000003-0000-0000-0000-000000000001'),
  ('fe000004-0000-0000-0000-000000000001');

insert into public.profiles (id, username, display_name) values
  ('fe000001-0000-0000-0000-000000000001', 'test-fo-me', 'FoMe'),
  ('fe000002-0000-0000-0000-000000000001', 'test-fo-friend', 'FoFriend'),
  ('fe000003-0000-0000-0000-000000000001', 'test-fo-stranger', 'FoStranger'),
  ('fe000004-0000-0000-0000-000000000001', 'test-fo-blocked', 'FoBlocked')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status, blocked_by) values
  ('fe000001-0000-0000-0000-000000000001', 'fe000002-0000-0000-0000-000000000001', 'accepted', null),
  ('fe000001-0000-0000-0000-000000000001', 'fe000004-0000-0000-0000-000000000001', 'blocked', 'fe000001-0000-0000-0000-000000000001');

insert into public.conversations (id, is_group) values
  ('fe000000-1111-0000-0000-000000000001', false);

insert into public.conversation_members (conversation_id, user_id) values
  ('fe000000-1111-0000-0000-000000000001', 'fe000001-0000-0000-0000-000000000001'),
  ('fe000000-1111-0000-0000-000000000001', 'fe000004-0000-0000-0000-000000000001');

insert into public.posts (author_id, body) values
  ('fe000001-0000-0000-0000-000000000001', 'fo own post'),
  ('fe000002-0000-0000-0000-000000000001', 'fo friend post'),
  ('fe000003-0000-0000-0000-000000000001', 'fo stranger post');

set local role authenticated;
set local request.jwt.claim.sub = 'fe000001-0000-0000-0000-000000000001';

select lives_ok(
  $$ select public.create_conversation(array['fe000002-0000-0000-0000-000000000001']::uuid[]) $$,
  'can start a chat with a friend'
);

select throws_ok(
  $$ select public.create_conversation(array['fe000003-0000-0000-0000-000000000001']::uuid[]) $$,
  'P0001',
  'Du kan bara chatta med dina vänner.',
  'cannot start a chat with a stranger'
);

select throws_ok(
  $$ select public.create_conversation(
       array['fe000002-0000-0000-0000-000000000001', 'fe000003-0000-0000-0000-000000000001']::uuid[],
       'Blandat'
     ) $$,
  'P0001',
  'Du kan bara chatta med dina vänner.',
  'cannot add a stranger to a new group'
);

select throws_ok(
  $$ select public.create_conversation(array['fe000004-0000-0000-0000-000000000001']::uuid[]) $$,
  'P0001',
  'Du kan bara chatta med dina vänner.',
  'cannot start a chat with a blocked user'
);

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ('fe000000-1111-0000-0000-000000000001', 'fe000001-0000-0000-0000-000000000001', 'hej') $$,
  '42501',
  null,
  'cannot send in a direct chat after blocking'
);

select is(
  (select count(*)::int from public.posts where body = 'fo own post'),
  1,
  'sees own post'
);

select is(
  (select count(*)::int from public.posts where body = 'fo friend post'),
  1,
  'sees a friend''s post'
);

select is(
  (select count(*)::int from public.posts where body = 'fo stranger post'),
  0,
  'does not see a stranger''s post'
);

set local request.jwt.claim.sub = 'fe000004-0000-0000-0000-000000000001';

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ('fe000000-1111-0000-0000-000000000001', 'fe000004-0000-0000-0000-000000000001', 'hej') $$,
  '42501',
  null,
  'blocked user cannot send in the direct chat'
);

set local request.jwt.claim.sub = 'fe000003-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.posts where body = 'fo own post'),
  0,
  'a stranger does not see my post'
);

select * from finish();

rollback;
