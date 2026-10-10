begin;

select plan(8);

insert into auth.users (id) values
  ('a4000000-0000-0000-0000-000000000041'),
  ('b4000000-0000-0000-0000-000000000042'),
  ('c4000000-0000-0000-0000-000000000043'),
  ('e4000000-0000-0000-0000-000000000044');

insert into public.profiles (id, username, display_name) values
  ('a4000000-0000-0000-0000-000000000041', 'test-heat-alice', 'Alice'),
  ('b4000000-0000-0000-0000-000000000042', 'test-heat-bob', 'Bob'),
  ('c4000000-0000-0000-0000-000000000043', 'test-heat-carol', 'Carol'),
  ('e4000000-0000-0000-0000-000000000044', 'test-heat-eve', 'Eve')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('e4000000-0000-0000-0000-000000000044', 'a4000000-0000-0000-0000-000000000041', 'accepted'),
  ('e4000000-0000-0000-0000-000000000044', 'b4000000-0000-0000-0000-000000000042', 'accepted');

insert into public.locations (user_id, lat, lng, sharing_enabled, status_text, status_expires_at) values
  ('a4000000-0000-0000-0000-000000000041', 59.3000, 18.1000, true, '  På Max ', now() + interval '5 days');

select ok(
  (select status_expires_at <= now() + interval '1 hour' from public.locations
    where user_id = 'a4000000-0000-0000-0000-000000000041'),
  'A status never lasts longer than one hour, whatever the client sends'
);

select is(
  (select status_text from public.locations where user_id = 'a4000000-0000-0000-0000-000000000041'),
  'På Max',
  'Status text is trimmed'
);

update public.locations set status_text = null where user_id = 'a4000000-0000-0000-0000-000000000041';

select is(
  (select status_expires_at from public.locations where user_id = 'a4000000-0000-0000-0000-000000000041'),
  null,
  'Clearing the status clears its expiry'
);

insert into public.locations (user_id, lat, lng, sharing_enabled) values
  ('b4000000-0000-0000-0000-000000000042', 59.3001, 18.1001, true),
  ('c4000000-0000-0000-0000-000000000043', 59.3002, 18.1002, true);

set local role authenticated;
set local request.jwt.claim.sub = 'e4000000-0000-0000-0000-000000000044';

select is(
  (select count(*)::int from public.evening_heat()),
  1,
  'Eve sees one heat cell where two of her friends have been'
);

select is(
  (select people from public.evening_heat()),
  2,
  'Only friends count towards Eve''s heat, not strangers'
);

select is(
  (select count(*)::int from public.heat_points),
  0,
  'Nobody can read raw heat points directly'
);

set local request.jwt.claim.sub = 'b4000000-0000-0000-0000-000000000042';

update public.locations set sharing_enabled = false where user_id = 'b4000000-0000-0000-0000-000000000042';

set local request.jwt.claim.sub = 'e4000000-0000-0000-0000-000000000044';

select is(
  (select count(*)::int from public.evening_heat()),
  0,
  'Turning on ghost mode removes Bob''s heat, leaving too few friends to show a cell'
);

set local request.jwt.claim.sub = 'c4000000-0000-0000-0000-000000000043';

select is(
  (select count(*)::int from public.evening_heat()),
  0,
  'Carol has no friends here and sees no heat'
);

select * from finish();

rollback;
