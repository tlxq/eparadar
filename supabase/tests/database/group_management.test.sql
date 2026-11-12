begin;

select plan(13);

select tests.create_user('f6000001-0000-0000-0000-000000000001', 'test-group-admin', 'GroupAdmin');
select tests.create_user('f6000002-0000-0000-0000-000000000001', 'test-group-b', 'GroupB');
select tests.create_user('f6000003-0000-0000-0000-000000000001', 'test-group-c', 'GroupC');
select tests.create_user('f6000004-0000-0000-0000-000000000001', 'test-group-outsider', 'GroupOutsider');

insert into public.conversations (id, is_group, name) values
  ('f6000000-1111-0000-0000-000000000001', true, 'Gänget'),
  ('f6000000-1111-0000-0000-000000000002', false, null);

insert into public.conversation_members (conversation_id, user_id, role, joined_at) values
  ('f6000000-1111-0000-0000-000000000001', 'f6000001-0000-0000-0000-000000000001', 'admin', now() - interval '3 days'),
  ('f6000000-1111-0000-0000-000000000001', 'f6000002-0000-0000-0000-000000000001', 'member', now() - interval '2 days'),
  ('f6000000-1111-0000-0000-000000000001', 'f6000003-0000-0000-0000-000000000001', 'member', now() - interval '1 day'),
  ('f6000000-1111-0000-0000-000000000002', 'f6000001-0000-0000-0000-000000000001', 'member', now()),
  ('f6000000-1111-0000-0000-000000000002', 'f6000002-0000-0000-0000-000000000001', 'member', now());

insert into public.friendships (requester_id, addressee_id, status) values
  ('f6000001-0000-0000-0000-000000000001', 'f6000002-0000-0000-0000-000000000001', 'accepted'),
  ('f6000001-0000-0000-0000-000000000001', 'f6000003-0000-0000-0000-000000000001', 'accepted');

select tests.login_as('f6000001-0000-0000-0000-000000000001');

select public.create_conversation(
  array['f6000002-0000-0000-0000-000000000001', 'f6000003-0000-0000-0000-000000000001']::uuid[],
  'Ny grupp'
);

select is(
  (select cm.role from public.conversation_members cm
   join public.conversations c on c.id = cm.conversation_id
   where c.name = 'Ny grupp' and cm.user_id = 'f6000001-0000-0000-0000-000000000001'),
  'admin',
  'whoever creates a group becomes its admin'
);

select tests.login_as('f6000002-0000-0000-0000-000000000001');

select lives_ok(
  $$ select public.rename_conversation('f6000000-1111-0000-0000-000000000001', '  Traktorgänget  ') $$,
  'any member can rename the group'
);

select is(
  (select name from public.conversations where id = 'f6000000-1111-0000-0000-000000000001'),
  'Traktorgänget',
  'the new name is trimmed'
);

select throws_ok(
  $$ select public.rename_conversation('f6000000-1111-0000-0000-000000000001', '   ') $$,
  'Gruppnamnet måste vara 1–40 tecken.',
  'an empty name is rejected'
);

select throws_ok(
  $$ select public.remove_member('f6000000-1111-0000-0000-000000000001', 'f6000003-0000-0000-0000-000000000001') $$,
  'Bara admin kan ta bort medlemmar.',
  'a regular member cannot remove others'
);

select tests.login_as('f6000004-0000-0000-0000-000000000001');

select throws_ok(
  $$ select public.rename_conversation('f6000000-1111-0000-0000-000000000001', 'Kapad') $$,
  'Du är inte med i den här chatten.',
  'an outsider cannot rename the group'
);

select tests.login_as('f6000001-0000-0000-0000-000000000001');

select throws_ok(
  $$ select public.remove_member('f6000000-1111-0000-0000-000000000001', 'f6000001-0000-0000-0000-000000000001') $$,
  'Använd Lämna gruppen för att gå ur själv.',
  'the admin cannot remove themselves'
);

select lives_ok(
  $$ select public.remove_member('f6000000-1111-0000-0000-000000000001', 'f6000003-0000-0000-0000-000000000001') $$,
  'the admin can remove a member'
);

select tests.login_as('f6000003-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.conversations where id = 'f6000000-1111-0000-0000-000000000001'),
  0,
  'a removed member can no longer see the group'
);

select tests.login_as('f6000001-0000-0000-0000-000000000001');

select throws_ok(
  $$ select public.leave_conversation('f6000000-1111-0000-0000-000000000002') $$,
  'Du kan bara lämna gruppchattar.',
  'you cannot leave a one-to-one chat'
);

select lives_ok(
  $$ select public.leave_conversation('f6000000-1111-0000-0000-000000000001') $$,
  'the admin can leave'
);

select tests.login_as('f6000002-0000-0000-0000-000000000001');

select is(
  (select role from public.conversation_members
   where conversation_id = 'f6000000-1111-0000-0000-000000000001'
     and user_id = 'f6000002-0000-0000-0000-000000000001'),
  'admin',
  'when the last admin leaves, the longest-standing member takes over'
);

select public.leave_conversation('f6000000-1111-0000-0000-000000000001');

select tests.logout();

select is(
  (select count(*)::int from public.conversations where id = 'f6000000-1111-0000-0000-000000000001'),
  0,
  'the group is deleted when the last member leaves'
);

select * from finish();
rollback;
