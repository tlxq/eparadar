begin;

select plan(6);

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

select * from finish();

rollback;
