begin;

select plan(20);

insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002'),
  ('cccccccc-0000-0000-0000-000000000003'),
  ('dddddddd-0000-0000-0000-000000000004'),
  ('eeeeeeee-0000-0000-0000-000000000005');

insert into public.profiles (id, username, display_name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'test-alice', 'Alice'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'test-bob', 'Bob'),
  ('cccccccc-0000-0000-0000-000000000003', 'test-carol', 'Carol'),
  ('dddddddd-0000-0000-0000-000000000004', 'test-dave', 'Dave'),
  ('eeeeeeee-0000-0000-0000-000000000005', 'test-eve', 'Eve')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'accepted');

insert into public.friendships (requester_id, addressee_id, status) values
  ('cccccccc-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001', 'pending');

insert into public.friendships (requester_id, addressee_id, status) values
  ('dddddddd-0000-0000-0000-000000000004', 'eeeeeeee-0000-0000-0000-000000000005', 'pending');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.friendships),
  2,
  'Alice (a participant on two rows) sees exactly her own two friendship rows'
);

set local request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';

select is(
  (select count(*)::int from public.friendships),
  1,
  'Bob sees only the row he participates in, not Carol/Alice''s pending request'
);

select is(
  public.is_friend('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002'),
  true,
  'is_friend is true for an accepted friendship in either argument order'
);

select is(
  public.is_friend('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003'),
  false,
  'is_friend is false while the request is still pending'
);

set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000005';

select is(
  ((public.send_friend_request('dddddddd-0000-0000-0000-000000000004')).status)::text,
  'accepted',
  'a reciprocal pending request auto-accepts instead of raising or duplicating'
);

select throws_ok(
  format('select public.send_friend_request(%L)', 'eeeeeeee-0000-0000-0000-000000000005'),
  'Du kan inte lägga till dig själv som vän.',
  'sending a friend request to yourself raises the Swedish self-request error'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

select throws_ok(
  format('select public.block_user(%L)', 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Du kan inte blockera dig själv.',
  'blocking yourself raises the Swedish self-block error'
);

select lives_ok(
  format('select public.block_user(%L)', 'cccccccc-0000-0000-0000-000000000003'),
  'Alice blocks Carol, flipping the existing pending row'
);

select is(
  (select status::text from public.friendships
   where requester_id = 'cccccccc-0000-0000-0000-000000000003' and addressee_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'blocked',
  'blocking flips the existing pending row to blocked'
);

select is(
  (select blocked_by from public.friendships
   where requester_id = 'cccccccc-0000-0000-0000-000000000003' and addressee_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'blocked_by records who initiated the block'
);

set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000003';

select is(
  (select count(*)::int from public.friendships
   where requester_id = 'cccccccc-0000-0000-0000-000000000003' and addressee_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'the blocked party cannot see the blocking row'
);

delete from public.friendships
where requester_id = 'cccccccc-0000-0000-0000-000000000003' and addressee_id = 'aaaaaaaa-0000-0000-0000-000000000001';

set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.friendships
   where requester_id = 'cccccccc-0000-0000-0000-000000000003' and addressee_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'the blocked party cannot delete a blocked row via RLS'
);

set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000003';

select throws_ok(
  format('select public.send_friend_request(%L)', 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Du kan inte skicka en vänförfrågan just nu.',
  'a blocked user cannot send a new friend request to their blocker'
);

select throws_ok(
  format('select public.unblock_user(%L)', 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Blockeringen hittades inte.',
  'the blocked party cannot unblock themselves'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

select lives_ok(
  format('select public.unblock_user(%L)', 'cccccccc-0000-0000-0000-000000000003'),
  'the blocker can unblock, removing the row entirely'
);

select is(
  (select count(*)::int from public.friendships
   where requester_id = 'cccccccc-0000-0000-0000-000000000003' and addressee_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  0,
  'unblocking deletes the friendship row entirely (clean slate)'
);

set local request.jwt.claim.sub = 'bbbbbbbb-0000-0000-0000-000000000002';

select lives_ok(
  format('select public.block_user(%L)', 'dddddddd-0000-0000-0000-000000000004'),
  'blocking a stranger with no prior relationship creates a fresh blocked row'
);

select is(
  (select status::text from public.friendships
   where requester_id = 'bbbbbbbb-0000-0000-0000-000000000002' and addressee_id = 'dddddddd-0000-0000-0000-000000000004'),
  'blocked',
  'the freshly-inserted row for a blocked stranger has status blocked'
);

set local request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';

select lives_ok(
  format('select public.block_user(%L)', 'bbbbbbbb-0000-0000-0000-000000000002'),
  'blocking an existing accepted friend succeeds'
);

select is(
  public.is_friend('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002'),
  false,
  'is_friend becomes false immediately after blocking a former friend'
);

select * from finish();

rollback;
