begin;

select plan(8);

insert into auth.users (id) values
  ('a1000000-0000-0000-0000-000000000011'),
  ('b1000000-0000-0000-0000-000000000012'),
  ('c1000000-0000-0000-0000-000000000013'),
  ('e1000000-0000-0000-0000-000000000014');

insert into public.profiles (id, username, display_name) values
  ('a1000000-0000-0000-0000-000000000011', 'test-loc-alice', 'Alice'),
  ('b1000000-0000-0000-0000-000000000012', 'test-loc-bob', 'Bob'),
  ('c1000000-0000-0000-0000-000000000013', 'test-loc-carol', 'Carol'),
  ('e1000000-0000-0000-0000-000000000014', 'test-loc-eve', 'Eve')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('a1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000012', 'accepted'),
  ('a1000000-0000-0000-0000-000000000011', 'e1000000-0000-0000-0000-000000000014', 'accepted');

insert into public.locations (user_id, lat, lng, sharing_enabled) values
  ('a1000000-0000-0000-0000-000000000011', 59.3, 18.1, true),
  ('e1000000-0000-0000-0000-000000000014', 57.7, 11.9, false);

set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000011';

select is(
  (select count(*)::int from public.locations where user_id = 'a1000000-0000-0000-0000-000000000011'),
  1,
  'Alice always sees her own location row'
);

set local request.jwt.claim.sub = 'b1000000-0000-0000-0000-000000000012';

select is(
  (select count(*)::int from public.locations where user_id = 'a1000000-0000-0000-0000-000000000011'),
  1,
  'Bob (a friend) sees Alice''s location while she has sharing enabled'
);

set local request.jwt.claim.sub = 'c1000000-0000-0000-0000-000000000013';

select is(
  (select count(*)::int from public.locations where user_id = 'a1000000-0000-0000-0000-000000000011'),
  0,
  'Carol (not a friend) never sees Alice''s location, even with sharing enabled'
);

set local request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000011';

select is(
  (select count(*)::int from public.locations where user_id = 'e1000000-0000-0000-0000-000000000014'),
  0,
  'Alice (a friend of Eve) does not see Eve''s location while sharing is disabled'
);

set local request.jwt.claim.sub = 'e1000000-0000-0000-0000-000000000014';

select is(
  (select count(*)::int from public.locations where user_id = 'e1000000-0000-0000-0000-000000000014'),
  1,
  'Eve always sees her own location row, even with sharing disabled'
);

select ok(
  (select lat = 59.3 and lng = 18.1 from public.locations
    where user_id = 'a1000000-0000-0000-0000-000000000011'),
  'Alice''s exact coordinates are untouched when approximate_enabled is false (the default)'
);

set local request.jwt.claim.sub = 'b1000000-0000-0000-0000-000000000012';

insert into public.locations (user_id, lat, lng, sharing_enabled, approximate_enabled) values
  ('b1000000-0000-0000-0000-000000000012', 59.31234, 18.05678, true, true);

select ok(
  (select abs(lat - 59.313) < 0.0001 and abs(lng - 18.057) < 0.0001
    from public.locations where user_id = 'b1000000-0000-0000-0000-000000000012'),
  'Bob''s coordinates are snapped to the ~300m grid on insert when approximate_enabled is true'
);

set local request.jwt.claim.sub = 'e1000000-0000-0000-0000-000000000014';

update public.locations set approximate_enabled = true
  where user_id = 'e1000000-0000-0000-0000-000000000014';

select ok(
  (select abs(lat - 57.699) < 0.0001 and abs(lng - 11.901) < 0.0001
    from public.locations where user_id = 'e1000000-0000-0000-0000-000000000014'),
  'Eve''s previously-exact coordinates get snapped to the grid the moment approximate_enabled flips on'
);

select * from finish();

rollback;
