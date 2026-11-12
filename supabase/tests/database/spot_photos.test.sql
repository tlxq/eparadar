begin;

select plan(7);

select tests.create_user('a5000000-0000-0000-0000-000000000051', 'test-photo-alice', 'Alice');
select tests.create_user('b5000000-0000-0000-0000-000000000052', 'test-photo-bob', 'Bob');
select tests.create_user('c5000000-0000-0000-0000-000000000053', 'test-photo-carol', 'Carol');

insert into public.friendships (requester_id, addressee_id, status) values
  ('a5000000-0000-0000-0000-000000000051', 'b5000000-0000-0000-0000-000000000052', 'accepted');

insert into public.spots (id, creator_id, kind, name, lat, lng) values
  ('a5000000-0000-0000-0000-0000000000a1', 'a5000000-0000-0000-0000-000000000051', 'ragg', 'Max', 59.3, 18.1);

insert into public.spots (id, creator_id, kind, warning_type, lat, lng) values
  ('a5000000-0000-0000-0000-0000000000a2', 'a5000000-0000-0000-0000-000000000051', 'varning', 'halka', 59.3, 18.1);

select tests.login_as('b5000000-0000-0000-0000-000000000052');

select lives_ok(
  $$insert into public.spot_photos (spot_id, author_id, path)
    values ('a5000000-0000-0000-0000-0000000000a1', 'b5000000-0000-0000-0000-000000000052',
            'a5000000-0000-0000-0000-0000000000a1/bob-1.jpg')$$,
  'Bob adds a photo to his friend''s Raggställe'
);

select ok(
  (select expires_at - created_at = interval '24 hours' from public.spot_photos
    where path = 'a5000000-0000-0000-0000-0000000000a1/bob-1.jpg'),
  'A spot photo lasts 24 hours'
);

select throws_ok(
  $$insert into public.spot_photos (spot_id, author_id, path)
    values ('a5000000-0000-0000-0000-0000000000a2', 'b5000000-0000-0000-0000-000000000052',
            'a5000000-0000-0000-0000-0000000000a2/bob-2.jpg')$$,
  '42501',
  null,
  'Photos only go on Raggställen, not warnings'
);

select tests.login_as('c5000000-0000-0000-0000-000000000053');

select is(
  (select count(*)::int from public.spot_photos),
  0,
  'Carol cannot see photos on a spot she cannot see'
);

select throws_ok(
  $$insert into public.spot_photos (spot_id, author_id, path)
    values ('a5000000-0000-0000-0000-0000000000a1', 'c5000000-0000-0000-0000-000000000053',
            'a5000000-0000-0000-0000-0000000000a1/carol.jpg')$$,
  '42501',
  null,
  'Carol cannot add photos to a spot she cannot see'
);

select tests.login_as('a5000000-0000-0000-0000-000000000051');

select is(
  (select count(*)::int from public.spot_photos),
  1,
  'Alice sees the photo on her own spot'
);

delete from public.spot_photos where path = 'a5000000-0000-0000-0000-0000000000a1/bob-1.jpg';

select is(
  (select count(*)::int from public.spot_photos),
  0,
  'The spot creator can remove photos on her spot'
);

select * from finish();

rollback;
