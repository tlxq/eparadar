begin;

select plan(9);

select tests.create_user('e9000001-0000-0000-0000-000000000001', 'test-read-a', 'ReadA');
select tests.create_user('e9000002-0000-0000-0000-000000000001', 'test-read-b', 'ReadB');
select tests.create_user('e9000003-0000-0000-0000-000000000001', 'test-read-c', 'ReadC');
select tests.create_user('e9000004-0000-0000-0000-000000000001', 'test-read-outsider', 'ReadOutsider');

insert into public.conversations (id, is_group, name) values
  ('e9000000-1111-0000-0000-000000000001', true, 'Lästest');

insert into public.conversation_members (conversation_id, user_id, last_read_at) values
  ('e9000000-1111-0000-0000-000000000001', 'e9000001-0000-0000-0000-000000000001', now() - interval '1 hour'),
  ('e9000000-1111-0000-0000-000000000001', 'e9000002-0000-0000-0000-000000000001', now() - interval '1 hour'),
  ('e9000000-1111-0000-0000-000000000001', 'e9000003-0000-0000-0000-000000000001', now() - interval '1 hour');

insert into public.messages (id, conversation_id, sender_id, body, created_at) values
  ('e9000000-2222-0000-0000-000000000001', 'e9000000-1111-0000-0000-000000000001', 'e9000001-0000-0000-0000-000000000001', 'oläst', now() - interval '10 minutes'),
  ('e9000000-2222-0000-0000-000000000002', 'e9000000-1111-0000-0000-000000000001', 'e9000001-0000-0000-0000-000000000001', 'läst', now() - interval '30 minutes');

select tests.login_as('e9000001-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.conversation_members
   where conversation_id = 'e9000000-1111-0000-0000-000000000001' and last_read_at is not null),
  3,
  'members can see each other''s read state'
);

select lives_ok(
  $$ delete from public.messages where id = 'e9000000-2222-0000-0000-000000000001' $$,
  'a plain delete is not an allowed path'
);

select is(
  (select count(*)::int from public.messages where id = 'e9000000-2222-0000-0000-000000000001'),
  1,
  'without a delete policy, a direct delete removes nothing'
);

select lives_ok(
  $$ select public.unsend_message('e9000000-2222-0000-0000-000000000001') $$,
  'the sender can unsend a message nobody has read'
);

select is(
  (select count(*)::int from public.messages where id = 'e9000000-2222-0000-0000-000000000001'),
  0,
  'an unsent message is gone'
);

select tests.logout();
update public.conversation_members set last_read_at = now() - interval '20 minutes'
where user_id = 'e9000002-0000-0000-0000-000000000001';

select tests.login_as('e9000001-0000-0000-0000-000000000001');

select throws_ok(
  $$ select public.unsend_message('e9000000-2222-0000-0000-000000000002') $$,
  'Meddelandet är redan läst och kan inte tas bort.',
  'a message one member has read can no longer be unsent'
);

select tests.login_as('e9000002-0000-0000-0000-000000000001');

select throws_ok(
  $$ select public.unsend_message('e9000000-2222-0000-0000-000000000002') $$,
  'Du kan bara ta bort dina egna meddelanden.',
  'nobody can unsend someone else''s message'
);

select ok(
  public.mark_conversation_read('e9000000-1111-0000-0000-000000000001') >= now(),
  'marking a chat as read moves your read time to now'
);

select tests.login_as('e9000004-0000-0000-0000-000000000001');

select throws_ok(
  $$ select public.mark_conversation_read('e9000000-1111-0000-0000-000000000001') $$,
  'Du är inte med i den här chatten.',
  'an outsider cannot mark a chat as read'
);

select * from finish();
rollback;
