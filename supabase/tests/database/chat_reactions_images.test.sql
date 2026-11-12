begin;

select plan(13);

select tests.create_user('a7000001-0000-0000-0000-000000000001', 'test-react-a', 'ReactA');
select tests.create_user('a7000002-0000-0000-0000-000000000001', 'test-react-b', 'ReactB');
select tests.create_user('a7000003-0000-0000-0000-000000000001', 'test-react-outsider', 'ReactOutsider');

insert into public.conversations (id, is_group) values
  ('a7000000-1111-0000-0000-000000000001', false),
  ('a7000000-1111-0000-0000-000000000002', false);

insert into public.conversation_members (conversation_id, user_id) values
  ('a7000000-1111-0000-0000-000000000001', 'a7000001-0000-0000-0000-000000000001'),
  ('a7000000-1111-0000-0000-000000000001', 'a7000002-0000-0000-0000-000000000001');

insert into public.messages (id, conversation_id, sender_id, body) values
  ('a7000000-2222-0000-0000-000000000001', 'a7000000-1111-0000-0000-000000000001', 'a7000002-0000-0000-0000-000000000001', 'Kolla avgasröret');

insert into storage.objects (bucket_id, name, owner_id) values
  ('chat-images', 'a7000000-1111-0000-0000-000000000001/bild.jpg', 'a7000001-0000-0000-0000-000000000001');

select tests.login_as('a7000001-0000-0000-0000-000000000001');

select is(
  public.toggle_reaction('a7000000-2222-0000-0000-000000000001', '❤️'),
  '❤️',
  'a member can react to a message'
);

select is(
  public.toggle_reaction('a7000000-2222-0000-0000-000000000001', '❤️'),
  null,
  'reacting with the same emoji again removes it'
);

select public.toggle_reaction('a7000000-2222-0000-0000-000000000001', '🔥');
select public.toggle_reaction('a7000000-2222-0000-0000-000000000001', '😂');

select is(
  (select string_agg(emoji, ',') from public.message_reactions
   where message_id = 'a7000000-2222-0000-0000-000000000001'),
  '😂',
  'a new emoji replaces your previous reaction'
);

select throws_ok(
  $$ select public.toggle_reaction('a7000000-2222-0000-0000-000000000001', '💩') $$,
  '23514',
  null,
  'only the six offered emojis are allowed'
);

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body)
     values ('a7000000-1111-0000-0000-000000000001', 'a7000001-0000-0000-0000-000000000001', '   ') $$,
  '23514',
  null,
  'a message needs text or an image'
);

select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, body, image_path)
     values ('a7000000-1111-0000-0000-000000000001', 'a7000001-0000-0000-0000-000000000001', '',
             'a7000000-1111-0000-0000-000000000002/bild.jpg') $$,
  '23514',
  null,
  'an image must belong to the same conversation'
);

select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, body, image_path)
     values ('a7000000-1111-0000-0000-000000000001', 'a7000001-0000-0000-0000-000000000001', '',
             'a7000000-1111-0000-0000-000000000001/bild.jpg') $$,
  'an image message without text is allowed'
);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'chat-images'),
  1,
  'a member can see their conversation''s chat images'
);

select tests.login_as('a7000002-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.message_reactions
   where message_id = 'a7000000-2222-0000-0000-000000000001'),
  1,
  'the other member sees the reaction'
);

select tests.login_as('a7000003-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.message_reactions),
  0,
  'an outsider cannot see reactions'
);

select throws_ok(
  $$ select public.toggle_reaction('a7000000-2222-0000-0000-000000000001', '👍') $$,
  'Meddelandet finns inte.',
  'an outsider cannot react'
);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'chat-images'),
  0,
  'an outsider cannot see the chat images'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('chat-images', 'a7000000-1111-0000-0000-000000000001/inbrott.jpg', 'a7000003-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'an outsider cannot upload into the conversation'
);

select * from finish();
rollback;
