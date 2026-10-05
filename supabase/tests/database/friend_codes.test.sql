begin;

select plan(16);

insert into auth.users (id) values
  ('c7000001-0000-0000-0000-000000000001'),
  ('c7000002-0000-0000-0000-000000000001'),
  ('c7000003-0000-0000-0000-000000000001'),
  ('c7000004-0000-0000-0000-000000000001'),
  ('c7000005-0000-0000-0000-000000000001'),
  ('c7000006-0000-0000-0000-000000000001');

insert into public.profiles (id, username, display_name) values
  ('c7000001-0000-0000-0000-000000000001', 'test-code-owner', 'CodeOwner'),
  ('c7000002-0000-0000-0000-000000000001', 'test-code-scanner', 'CodeScanner'),
  ('c7000003-0000-0000-0000-000000000001', 'test-code-blocked', 'CodeBlocked'),
  ('c7000004-0000-0000-0000-000000000001', 'test-code-friend', 'CodeFriend'),
  ('c7000005-0000-0000-0000-000000000001', 'test-code-guesser', 'CodeGuesser'),
  ('c7000006-0000-0000-0000-000000000001', 'test-code-late', 'CodeLate')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status, blocked_by) values
  ('c7000001-0000-0000-0000-000000000001', 'c7000003-0000-0000-0000-000000000001', 'blocked', 'c7000001-0000-0000-0000-000000000001');

insert into public.friendships (requester_id, addressee_id, status) values
  ('c7000001-0000-0000-0000-000000000001', 'c7000004-0000-0000-0000-000000000001', 'accepted');

set local role authenticated;
set local request.jwt.claim.sub = 'c7000001-0000-0000-0000-000000000001';

select matches(
  (select code from public.current_friend_code()),
  '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$',
  'a fresh code is six characters from the unambiguous alphabet'
);

select is(
  (select code from public.current_friend_code()),
  (select code from public.friend_codes where user_id = 'c7000001-0000-0000-0000-000000000001'),
  'asking again reuses the still-valid code'
);

select ok(
  (select expires_at from public.current_friend_code()) <= now() + interval '10 minutes',
  'a code is valid for at most ten minutes'
);

select is(
  (select count(*)::int from public.friend_codes),
  1,
  'the owner can read their own code row'
);

reset role;
update public.friend_codes set code = 'K7P2QX', expires_at = now() + interval '5 minutes'
where user_id = 'c7000001-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub = 'c7000002-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.friend_codes),
  0,
  'other users cannot read someone else''s code'
);

select is(
  (select outcome || ':' || display_name from public.redeem_friend_code('k7p-2qx')),
  'sent:CodeOwner',
  'redeeming a valid code (any case, with a dash) sends a request to the owner'
);

select is(
  (select status from public.friendships
   where requester_id = 'c7000002-0000-0000-0000-000000000001'
     and addressee_id = 'c7000001-0000-0000-0000-000000000001'),
  'pending',
  'the scan creates a pending request, not a friendship'
);

select is(
  (select outcome from public.redeem_friend_code('K7P2QX')),
  'already_sent',
  'scanning the same code again reports the request as already sent'
);

set local request.jwt.claim.sub = 'c7000001-0000-0000-0000-000000000001';

select is(
  (select outcome from public.redeem_friend_code('K7P2QX')),
  'own_code',
  'redeeming your own code is rejected'
);

set local request.jwt.claim.sub = 'c7000003-0000-0000-0000-000000000001';

select is(
  (select outcome || ':' || coalesce(display_name, '') from public.redeem_friend_code('K7P2QX')),
  'invalid:',
  'a blocked user gets the same answer as an expired code and learns nothing about the owner'
);

set local request.jwt.claim.sub = 'c7000004-0000-0000-0000-000000000001';

select is(
  (select outcome from public.redeem_friend_code('K7P2QX')),
  'already_friends',
  'an existing friend is told they are already friends'
);

set local request.jwt.claim.sub = 'c7000002-0000-0000-0000-000000000001';

select lives_ok(
  $$ select public.current_friend_code() $$,
  'the scanner can issue their own code'
);

reset role;
update public.friend_codes set code = 'M3RT9W', expires_at = now() + interval '5 minutes'
where user_id = 'c7000002-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub = 'c7000001-0000-0000-0000-000000000001';

select is(
  (select outcome from public.redeem_friend_code('M3RT9W')),
  'accepted',
  'redeeming the code of someone who already sent you a request accepts it'
);

reset role;
update public.friend_codes set expires_at = now() - interval '1 minute'
where user_id = 'c7000002-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub = 'c7000006-0000-0000-0000-000000000001';

select is(
  (select outcome from public.redeem_friend_code('M3RT9W')),
  'invalid',
  'an expired code no longer works'
);

set local request.jwt.claim.sub = 'c7000005-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from (
    select public.redeem_friend_code(guess)
    from unnest(array['AAAAAA','BBBBBB','CCCCCC','DDDDDD','EEEEEE','FFFFFF','GGGGGG','HHHHHH','JJJJJJ','KKKKKK']) as guess
  ) attempts),
  10,
  'ten wrong guesses within ten minutes are allowed'
);

select throws_ok(
  $$ select public.redeem_friend_code('MMMMMM') $$,
  'För många försök. Vänta några minuter och prova igen.',
  'the eleventh guess within ten minutes is rate limited'
);

select * from finish();
rollback;
