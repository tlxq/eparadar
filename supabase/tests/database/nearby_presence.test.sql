begin;

select plan(11);

insert into auth.users (id) values
  ('d8000001-0000-0000-0000-000000000001'),
  ('d8000002-0000-0000-0000-000000000001'),
  ('d8000003-0000-0000-0000-000000000001'),
  ('d8000004-0000-0000-0000-000000000001'),
  ('d8000005-0000-0000-0000-000000000001'),
  ('d8000006-0000-0000-0000-000000000001'),
  ('d8000007-0000-0000-0000-000000000001'),
  ('d8000008-0000-0000-0000-000000000001');

insert into public.profiles (id, username, display_name) values
  ('d8000001-0000-0000-0000-000000000001', 'test-near-me', 'NearMe'),
  ('d8000002-0000-0000-0000-000000000001', 'test-near-close', 'NearClose'),
  ('d8000003-0000-0000-0000-000000000001', 'test-near-far', 'NearFar'),
  ('d8000004-0000-0000-0000-000000000001', 'test-near-blocked', 'NearBlocked'),
  ('d8000005-0000-0000-0000-000000000001', 'test-near-friend', 'NearFriend'),
  ('d8000006-0000-0000-0000-000000000001', 'test-near-stale', 'NearStale'),
  ('d8000007-0000-0000-0000-000000000001', 'test-near-sent', 'NearSent'),
  ('d8000008-0000-0000-0000-000000000001', 'test-near-received', 'NearReceived')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status, blocked_by) values
  ('d8000004-0000-0000-0000-000000000001', 'd8000001-0000-0000-0000-000000000001', 'blocked', 'd8000004-0000-0000-0000-000000000001');

insert into public.friendships (requester_id, addressee_id, status) values
  ('d8000001-0000-0000-0000-000000000001', 'd8000005-0000-0000-0000-000000000001', 'accepted'),
  ('d8000001-0000-0000-0000-000000000001', 'd8000007-0000-0000-0000-000000000001', 'pending'),
  ('d8000008-0000-0000-0000-000000000001', 'd8000001-0000-0000-0000-000000000001', 'pending');

insert into public.nearby_presence (user_id, lat, lng, seen_at) values
  ('d8000002-0000-0000-0000-000000000001', 59.38700, 16.93850, now()),
  ('d8000003-0000-0000-0000-000000000001', 59.39000, 16.93850, now()),
  ('d8000004-0000-0000-0000-000000000001', 59.38670, 16.93860, now()),
  ('d8000005-0000-0000-0000-000000000001', 59.38660, 16.93840, now()),
  ('d8000006-0000-0000-0000-000000000001', 59.38665, 16.93850, now() - interval '1 minute'),
  ('d8000007-0000-0000-0000-000000000001', 59.38668, 16.93855, now()),
  ('d8000008-0000-0000-0000-000000000001', 59.38662, 16.93845, now());

set local role authenticated;
set local request.jwt.claim.sub = 'd8000001-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.nearby_presence),
  0,
  'nobody can read the presence table directly'
);

select is(
  (select request_state from public.scan_nearby(59.38665, 16.93850) where username = 'test-near-close'),
  'none',
  'someone about 40 m away with the radar open is listed'
);

select is(
  (select count(*)::int from public.scan_nearby(59.38665, 16.93850) where username = 'test-near-far'),
  0,
  'someone about 370 m away is not listed'
);

select is(
  (select count(*)::int from public.scan_nearby(59.38665, 16.93850) where username = 'test-near-blocked'),
  0,
  'a user who blocked you is never listed'
);

select is(
  (select count(*)::int from public.scan_nearby(59.38665, 16.93850) where username = 'test-near-friend'),
  0,
  'existing friends are left out'
);

select is(
  (select count(*)::int from public.scan_nearby(59.38665, 16.93850) where username = 'test-near-stale'),
  0,
  'someone who closed the radar a minute ago is no longer listed'
);

select is(
  (select request_state from public.scan_nearby(59.38665, 16.93850) where username = 'test-near-sent'),
  'sent',
  'a pending request you sent shows as sent'
);

select is(
  (select request_state from public.scan_nearby(59.38665, 16.93850) where username = 'test-near-received'),
  'received',
  'a pending request to you shows as received'
);

set local request.jwt.claim.sub = 'd8000004-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.scan_nearby(59.38670, 16.93860) where username = 'test-near-me'),
  0,
  'the blocker does not see the person they blocked either'
);

set local request.jwt.claim.sub = 'd8000002-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.scan_nearby(59.38700, 16.93850) where username = 'test-near-me'),
  1,
  'scanning makes you visible to others nearby'
);

set local request.jwt.claim.sub = 'd8000001-0000-0000-0000-000000000001';
select public.leave_nearby();

set local request.jwt.claim.sub = 'd8000002-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.scan_nearby(59.38700, 16.93850) where username = 'test-near-me'),
  0,
  'leaving the radar makes you invisible immediately'
);

select * from finish();
rollback;
