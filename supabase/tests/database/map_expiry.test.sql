begin;

select plan(22);

insert into auth.users (id) values
  ('7e000001-0000-0000-0000-000000000001'),
  ('7e000002-0000-0000-0000-000000000002'),
  ('7e000003-0000-0000-0000-000000000003'),
  ('7e000004-0000-0000-0000-000000000004');

insert into public.profiles (id, username, display_name) values
  ('7e000001-0000-0000-0000-000000000001', 'test-exp-alice', 'Alice'),
  ('7e000002-0000-0000-0000-000000000002', 'test-exp-bob', 'Bob'),
  ('7e000003-0000-0000-0000-000000000003', 'test-exp-carol', 'Carol'),
  ('7e000004-0000-0000-0000-000000000004', 'test-exp-dan', 'Dan')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('7e000001-0000-0000-0000-000000000001', '7e000002-0000-0000-0000-000000000002', 'accepted'),
  ('7e000004-0000-0000-0000-000000000004', '7e000002-0000-0000-0000-000000000002', 'accepted');

insert into public.locations (user_id, lat, lng, sharing_enabled, status_text, updated_at) values
  ('7e000001-0000-0000-0000-000000000001', 59.3, 18.1, true, 'Vid macken', now()),
  ('7e000004-0000-0000-0000-000000000004', 59.4, 18.2, true, null, now() - interval '13 hours');

alter table public.locations disable trigger locations_status_expiry;
update public.locations set status_expires_at = now() - interval '1 minute'
  where user_id = '7e000001-0000-0000-0000-000000000001';
alter table public.locations enable trigger locations_status_expiry;

insert into public.spots (id, creator_id, kind, name, lat, lng, visibility) values
  ('7e0000a1-0000-0000-0000-000000000001', '7e000001-0000-0000-0000-000000000001', 'ragg', 'Torget', 59.3, 18.1, 'all'),
  ('7e0000a2-0000-0000-0000-000000000002', '7e000001-0000-0000-0000-000000000001', 'ragg', 'Gamla torget', 59.31, 18.11, 'friends');

update public.spots set expires_at = now() - interval '1 minute'
  where id = '7e0000a2-0000-0000-0000-000000000002';

insert into public.spot_photos (id, spot_id, author_id, path) values
  ('7e0000b1-0000-0000-0000-000000000001', '7e0000a1-0000-0000-0000-000000000001', '7e000001-0000-0000-0000-000000000001', '7e0000a1-0000-0000-0000-000000000001/old.jpg');

update public.spot_photos set expires_at = now() - interval '1 minute'
  where id = '7e0000b1-0000-0000-0000-000000000001';

insert into public.meetups (id, creator_id, title, vibe, lat, lng, starts_at) values
  ('7e0000c1-0000-0000-0000-000000000001', '7e000001-0000-0000-0000-000000000001', 'Ikväll', 'hang', 59.3, 18.1, now() + interval '2 hours'),
  ('7e0000c2-0000-0000-0000-000000000002', '7e000001-0000-0000-0000-000000000001', 'Förra veckan', 'hang', 59.3, 18.1, now() - interval '2 days');

select is(
  (select visibility from public.spots where id = '7e0000a1-0000-0000-0000-000000000001'),
  'friends',
  'a spot asked to be shared with everyone is stored as friends-only'
);

select is(
  (select expires_at - created_at from public.spots where id = '7e0000a1-0000-0000-0000-000000000001'),
  interval '24 hours',
  'a Raggställe expires 24 hours after it is created'
);

select is(
  (select count(*)::int from cron.job where jobname = 'purge-expired-map-data'),
  1,
  'the cleanup runs on a schedule'
);

set local role anon;

select is((select count(*)::int from public.locations), 0, 'a logged-out caller reads no positions');
select is((select count(*)::int from public.spots), 0, 'a logged-out caller reads no spots');
select is((select count(*)::int from public.meetups), 0, 'a logged-out caller reads no meetups');

select throws_ok(
  'select public.take_storage_cleanup()',
  '42501',
  null,
  'a logged-out caller cannot take the storage cleanup queue'
);

set local role authenticated;
set local request.jwt.claim.sub = '7e000003-0000-0000-0000-000000000003';

select is((select count(*)::int from public.locations), 0, 'a stranger reads no positions');
select is((select count(*)::int from public.spots), 0, 'a stranger reads no spots');
select is((select count(*)::int from public.meetups), 0, 'a stranger reads no meetups');
select is((select count(*)::int from public.storage_cleanup), 0, 'a stranger cannot read the storage cleanup queue');

select throws_ok(
  'select public.purge_expired_map_data()',
  '42501',
  null,
  'a logged-in user cannot run the cleanup'
);

set local request.jwt.claim.sub = '7e000002-0000-0000-0000-000000000002';

select is(
  (select count(*)::int from public.locations where user_id = '7e000001-0000-0000-0000-000000000001'),
  1,
  'a friend sees a fresh shared position'
);

select is(
  (select count(*)::int from public.locations where user_id = '7e000004-0000-0000-0000-000000000004'),
  0,
  'a friend does not see a position older than 12 hours'
);

select is(
  (select count(*)::int from public.spots),
  1,
  'a friend sees the live spot but not the expired one'
);

select is(
  (select count(*)::int from public.meetups),
  1,
  'a friend sees the upcoming meetup but not last week''s'
);

set local request.jwt.claim.sub = '7e000004-0000-0000-0000-000000000004';

select is(
  (select count(*)::int from public.locations where user_id = '7e000004-0000-0000-0000-000000000004'),
  1,
  'the owner still sees their own row'
);

reset role;

select public.purge_expired_map_data();

select is(
  (select lat from public.locations where user_id = '7e000004-0000-0000-0000-000000000004'),
  null,
  'the cleanup forgets a position older than 12 hours'
);

select is(
  (select status_text from public.locations where user_id = '7e000001-0000-0000-0000-000000000001'),
  null,
  'the cleanup clears an expired status'
);

select is(
  (select count(*)::int from public.spots where id = '7e0000a2-0000-0000-0000-000000000002'),
  0,
  'the cleanup deletes an expired spot'
);

select is(
  (select count(*)::int from public.meetups where id = '7e0000c2-0000-0000-0000-000000000002'),
  0,
  'the cleanup deletes a meetup that ended more than a day ago'
);

select is(
  (select count(*)::int from public.take_storage_cleanup()
    where path = '7e0000a1-0000-0000-0000-000000000001/old.jpg'),
  1,
  'the file of an expired spot photo is queued for removal'
);

select * from finish();

rollback;
