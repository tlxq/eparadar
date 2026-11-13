begin;

select plan(18);

select tests.create_user('68f00001-0000-0000-0000-000000000001', 'test-feed-alice', 'FeedAlice');
select tests.create_user('68f00002-0000-0000-0000-000000000001', 'test-feed-bob', 'FeedBob');
select tests.create_user('68f00003-0000-0000-0000-000000000001', 'test-feed-carol', 'FeedCarol');
select tests.create_user('68f00004-0000-0000-0000-000000000001', 'test-feed-dave', 'FeedDave');

insert into public.friendships (requester_id, addressee_id, status) values
  ('68f00001-0000-0000-0000-000000000001', '68f00002-0000-0000-0000-000000000001', 'accepted'),
  ('68f00001-0000-0000-0000-000000000001', '68f00004-0000-0000-0000-000000000001', 'accepted');

insert into public.posts (id, author_id, body) values
  ('68f000a1-0000-0000-0000-000000000001', '68f00001-0000-0000-0000-000000000001', 'Ny fälg');

insert into public.conversations (id, is_group) values
  ('68f000c1-0000-0000-0000-000000000001', false);

insert into public.conversation_members (conversation_id, user_id) values
  ('68f000c1-0000-0000-0000-000000000001', '68f00002-0000-0000-0000-000000000001'),
  ('68f000c1-0000-0000-0000-000000000001', '68f00003-0000-0000-0000-000000000001');

select tests.login_as('68f00002-0000-0000-0000-000000000001');

select lives_ok(
  $$insert into public.post_reactions (post_id, user_id, emoji)
    values ('68f000a1-0000-0000-0000-000000000001', '68f00002-0000-0000-0000-000000000001', '🔥')$$,
  'A friend reacts to a post'
);

select lives_ok(
  $$insert into public.post_reactions (post_id, user_id, emoji)
    values ('68f000a1-0000-0000-0000-000000000001', '68f00002-0000-0000-0000-000000000001', '😂')$$,
  'A friend can add a second emoji to the same post'
);

select throws_ok(
  $$insert into public.post_reactions (post_id, user_id, emoji)
    values ('68f000a1-0000-0000-0000-000000000001', '68f00002-0000-0000-0000-000000000001', '🔥')$$,
  '23505',
  null,
  'The same emoji twice is one row'
);

select throws_ok(
  $$insert into public.post_reactions (post_id, user_id, emoji)
    values ('68f000a1-0000-0000-0000-000000000001', '68f00002-0000-0000-0000-000000000001', '💩')$$,
  '23514',
  null,
  'Only the offered emojis are allowed'
);

select lives_ok(
  $$insert into public.post_reactions (post_id, user_id, emoji)
    values ('68f000a1-0000-0000-0000-000000000001', '68f00002-0000-0000-0000-000000000001', '❤️')$$,
  'A friend can use the heart, one of the six shared with chat'
);

delete from public.post_reactions
where user_id = '68f00002-0000-0000-0000-000000000001' and emoji = '❤️';

select throws_ok(
  $$insert into public.post_reactions (post_id, user_id, emoji)
    values ('68f000a1-0000-0000-0000-000000000001', '68f00001-0000-0000-0000-000000000001', '👍')$$,
  '42501',
  null,
  'Nobody reacts in someone else''s name'
);

select lives_ok(
  $$insert into public.messages (conversation_id, sender_id, body, post_id)
    values ('68f000c1-0000-0000-0000-000000000001', '68f00002-0000-0000-0000-000000000001', '',
            '68f000a1-0000-0000-0000-000000000001')$$,
  'A friend sends a post they can see to a chat'
);

select tests.login_as('68f00004-0000-0000-0000-000000000001');

insert into public.post_reactions (post_id, user_id, emoji)
values ('68f000a1-0000-0000-0000-000000000001', '68f00004-0000-0000-0000-000000000001', '👍');

select tests.login_as('68f00002-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.post_reactions),
  2,
  'A friend sees their own reactions but not those from people they are not kompis with'
);

select tests.login_as('68f00001-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.post_reactions),
  3,
  'The author sees every reaction on her post'
);

delete from public.post_reactions where user_id = '68f00002-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.post_reactions where user_id = '68f00002-0000-0000-0000-000000000001'),
  2,
  'The author cannot remove someone else''s reaction'
);

select tests.login_as('68f00003-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.post_reactions),
  0,
  'A stranger sees no reactions'
);

select throws_ok(
  $$insert into public.post_reactions (post_id, user_id, emoji)
    values ('68f000a1-0000-0000-0000-000000000001', '68f00003-0000-0000-0000-000000000001', '🔥')$$,
  '42501',
  null,
  'A stranger cannot react to a post they cannot see'
);

select throws_ok(
  $$insert into public.post_reactions (post_id, user_id, emoji)
    values ('68f000a1-0000-0000-0000-000000000001', '68f00003-0000-0000-0000-000000000001', '😮')$$,
  '42501',
  null,
  'A stranger cannot react with the new emojis either'
);

select throws_ok(
  $$insert into public.messages (conversation_id, sender_id, body, post_id)
    values ('68f000c1-0000-0000-0000-000000000001', '68f00003-0000-0000-0000-000000000001', '',
            '68f000a1-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'A stranger cannot share a post they cannot see'
);

select is(
  (select count(*)::int from public.posts p
   join public.messages m on m.post_id = p.id
   where m.conversation_id = '68f000c1-0000-0000-0000-000000000001'),
  0,
  'A shared post stays hidden from a chat member who is not the author''s kompis'
);

select tests.login_as('68f00002-0000-0000-0000-000000000001');

delete from public.post_reactions
where user_id = '68f00002-0000-0000-0000-000000000001' and emoji = '😂';

select is(
  (select count(*)::int from public.post_reactions where user_id = '68f00002-0000-0000-0000-000000000001'),
  1,
  'People remove their own reaction'
);

select tests.logout();
select tests.login_anon();

select throws_ok(
  $$insert into public.post_reactions (post_id, user_id, emoji)
    values ('68f000a1-0000-0000-0000-000000000001', '68f00002-0000-0000-0000-000000000001', '😢')$$,
  '42501',
  null,
  'Logged-out users cannot react'
);

select throws_ok(
  $$select count(*) from public.post_reactions$$,
  '42501',
  null,
  'Logged-out users see no reactions'
);

select * from finish();

rollback;
