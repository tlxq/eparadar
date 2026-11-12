begin;

select plan(24);

select tests.create_user('6a000001-0000-0000-0000-000000000001', 'test-6j-owner', 'SixjOwner');
select tests.create_user('6a000002-0000-0000-0000-000000000001', 'test-6j-member', 'SixjMember');
select tests.create_user('6a000003-0000-0000-0000-000000000001', 'test-6j-stranger', 'SixjStranger');
select tests.create_user('6a000004-0000-0000-0000-000000000001', 'test-6j-friend', 'SixjFriend');
select tests.create_user('6a000005-0000-0000-0000-000000000001', 'test-6j-blocked', 'SixjBlocked');

insert into public.friendships (requester_id, addressee_id, status, blocked_by) values
  ('6a000001-0000-0000-0000-000000000001', '6a000002-0000-0000-0000-000000000001', 'accepted', null),
  ('6a000001-0000-0000-0000-000000000001', '6a000004-0000-0000-0000-000000000001', 'accepted', null),
  ('6a000001-0000-0000-0000-000000000001', '6a000005-0000-0000-0000-000000000001', 'accepted', null),
  ('6a000002-0000-0000-0000-000000000001', '6a000005-0000-0000-0000-000000000001', 'blocked', '6a000002-0000-0000-0000-000000000001');

insert into public.conversations (id, is_group, name) values
  ('6a000000-1111-0000-0000-000000000001', true, 'Sexj-gänget');

insert into public.conversation_members (conversation_id, user_id, role) values
  ('6a000000-1111-0000-0000-000000000001', '6a000001-0000-0000-0000-000000000001', 'admin'),
  ('6a000000-1111-0000-0000-000000000001', '6a000002-0000-0000-0000-000000000001', 'member');

insert into public.messages (id, conversation_id, sender_id, body, created_at) values
  ('6a000000-2222-0000-0000-000000000001', '6a000000-1111-0000-0000-000000000001', '6a000001-0000-0000-0000-000000000001', 'gammalt', now() - interval '1 hour');

insert into public.conversation_mutes (conversation_id, user_id, muted_until) values
  ('6a000000-1111-0000-0000-000000000001', '6a000002-0000-0000-0000-000000000001', now() + interval '8 hours');

select tests.login_anon();

select throws_ok(
  $$ select public.set_conversation_mute('6a000000-1111-0000-0000-000000000001', now() + interval '1 hour') $$,
  '42501',
  null,
  'a logged-out caller cannot mute'
);

select throws_ok(
  $$ select public.add_conversation_members('6a000000-1111-0000-0000-000000000001', array['6a000004-0000-0000-0000-000000000001']::uuid[]) $$,
  '42501',
  null,
  'a logged-out caller cannot add members'
);

select tests.login_as('6a000003-0000-0000-0000-000000000001');

select is_empty(
  $$ select 1 from public.conversation_mutes $$,
  'a stranger sees no mutes'
);

select throws_ok(
  $$ select public.set_conversation_mute('6a000000-1111-0000-0000-000000000001', now() + interval '1 hour') $$,
  'Du är inte med i den här chatten.',
  'a stranger cannot mute a chat they are not in'
);

select throws_ok(
  $$ select public.add_conversation_members('6a000000-1111-0000-0000-000000000001', array['6a000003-0000-0000-0000-000000000001']::uuid[]) $$,
  'Du är inte med i den här gruppen.',
  'a stranger cannot add themselves to a group'
);

select throws_ok(
  $$ insert into public.conversation_mutes (conversation_id, user_id, muted_until)
     values ('6a000000-1111-0000-0000-000000000001', '6a000003-0000-0000-0000-000000000001', now() + interval '1 hour') $$,
  '42501',
  null,
  'mutes cannot be written directly'
);

select tests.login_as('6a000001-0000-0000-0000-000000000001');

select is_empty(
  $$ select 1 from public.conversation_mutes $$,
  'another member does not see someone else''s mute'
);

select lives_ok(
  $$ select public.set_conversation_mute('6a000000-1111-0000-0000-000000000001', now() + interval '1 hour') $$,
  'a member can mute the chat'
);

select is(
  (select count(*)::int from public.conversation_mutes),
  1,
  'the member sees their own mute'
);

select throws_ok(
  $$ select public.set_conversation_mute('6a000000-1111-0000-0000-000000000001', now() - interval '1 hour') $$,
  'Tiden måste vara framåt.',
  'a mute in the past is rejected'
);

select lives_ok(
  $$ select public.set_conversation_mute('6a000000-1111-0000-0000-000000000001', 'infinity') $$,
  'a member can mute until they turn it back on'
);

select is(
  (select muted_until from public.conversation_mutes),
  'infinity'::timestamptz,
  'muting again replaces the time'
);

select lives_ok(
  $$ select public.set_conversation_mute('6a000000-1111-0000-0000-000000000001', null) $$,
  'a member can unmute'
);

select is_empty(
  $$ select 1 from public.conversation_mutes $$,
  'unmuting removes the row'
);

select throws_ok(
  $$ select public.add_conversation_members('6a000000-1111-0000-0000-000000000001', array['6a000003-0000-0000-0000-000000000001']::uuid[]) $$,
  'Du kan bara lägga till dina kompisar.',
  'a non-friend cannot be added'
);

select throws_ok(
  $$ select public.add_conversation_members('6a000000-1111-0000-0000-000000000001', array['6a000005-0000-0000-0000-000000000001']::uuid[]) $$,
  'Någon av dem du valde kan inte läggas till i gruppen.',
  'a friend who is blocked with someone in the group cannot be added'
);

select throws_ok(
  $$ select public.add_conversation_members('6a000000-1111-0000-0000-000000000001', array['6a000002-0000-0000-0000-000000000001']::uuid[]) $$,
  'Välj minst en kompis som inte redan är med.',
  'adding someone who is already in the group is rejected'
);

select tests.login_as('6a000002-0000-0000-0000-000000000001');

select throws_ok(
  $$ select public.add_conversation_members('6a000000-1111-0000-0000-000000000001', array['6a000004-0000-0000-0000-000000000001']::uuid[]) $$,
  'Du kan bara lägga till dina kompisar.',
  'a member can only add their own friends'
);

select lives_ok(
  $$ select public.rename_conversation('6a000000-1111-0000-0000-000000000001', 'Nytt namn') $$,
  'a member who is not admin can rename the group'
);

select tests.login_as('6a000001-0000-0000-0000-000000000001');

select is(
  public.add_conversation_members(
    '6a000000-1111-0000-0000-000000000001',
    array['6a000004-0000-0000-0000-000000000001']::uuid[]
  ),
  1,
  'a member can add a friend to the group'
);

select tests.login_as('6a000004-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.conversation_members where conversation_id = '6a000000-1111-0000-0000-000000000001'),
  3,
  'the added friend is now in the group'
);

select is_empty(
  $$ select 1 from public.messages where id = '6a000000-2222-0000-0000-000000000001' $$,
  'an added member does not see messages from before they joined'
);

select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ('6a000000-1111-0000-0000-000000000001', '6a000004-0000-0000-0000-000000000001', 'hej') $$,
  'an added member can write'
);

select tests.login_as('6a000001-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.messages where conversation_id = '6a000000-1111-0000-0000-000000000001'),
  2,
  'founding members still see the whole history'
);

select * from finish();

rollback;
