begin;

select plan(11);

select tests.create_user('a3000000-0000-0000-0000-000000000031', 'test-spot-alice', 'Alice');
select tests.create_user('b3000000-0000-0000-0000-000000000032', 'test-spot-bob', 'Bob');
select tests.create_user('c3000000-0000-0000-0000-000000000033', 'test-spot-carol', 'Carol');
select tests.create_user('d3000000-0000-0000-0000-000000000034', 'test-spot-dan', 'Dan');

insert into public.friendships (requester_id, addressee_id, status) values
  ('a3000000-0000-0000-0000-000000000031', 'b3000000-0000-0000-0000-000000000032', 'accepted');

insert into public.friendships (requester_id, addressee_id, status, blocked_by) values
  ('a3000000-0000-0000-0000-000000000031', 'd3000000-0000-0000-0000-000000000034', 'blocked', 'a3000000-0000-0000-0000-000000000031');

insert into public.spots (id, creator_id, kind, name, lat, lng, visibility) values
  ('a3000000-0000-0000-0000-0000000000a1', 'a3000000-0000-0000-0000-000000000031', 'ragg', 'Max-rondellen', 59.3, 18.1, 'friends'),
  ('a3000000-0000-0000-0000-0000000000a2', 'a3000000-0000-0000-0000-000000000031', 'ragg', 'Torget', 59.31, 18.11, 'all');

insert into public.spots (id, creator_id, kind, warning_type, lat, lng) values
  ('a3000000-0000-0000-0000-0000000000a3', 'a3000000-0000-0000-0000-000000000031', 'varning', 'halka', 59.32, 18.12),
  ('a3000000-0000-0000-0000-0000000000a4', 'a3000000-0000-0000-0000-000000000031', 'varning', 'grop', 59.33, 18.13);

update public.spots set expires_at = now() - interval '1 minute'
  where id = 'a3000000-0000-0000-0000-0000000000a4';

select is(
  (select expires_at - created_at from public.spots where id = 'a3000000-0000-0000-0000-0000000000a3'),
  interval '2 hours',
  'A warning expires two hours after it is created'
);

select tests.login_as('a3000000-0000-0000-0000-000000000031');

select is(
  (select count(*)::int from public.spots),
  3,
  'Alice sees her own live spots but not the expired warning'
);

select tests.login_as('b3000000-0000-0000-0000-000000000032');

select is(
  (select count(*)::int from public.spots where id = 'a3000000-0000-0000-0000-0000000000a1'),
  1,
  'Bob (a friend) sees a friends-only Raggställe'
);

select tests.login_as('c3000000-0000-0000-0000-000000000033');

select is(
  (select count(*)::int from public.spots where id = 'a3000000-0000-0000-0000-0000000000a1'),
  0,
  'Carol (not a friend) does not see a friends-only Raggställe'
);

select is(
  (select count(*)::int from public.spots where id = 'a3000000-0000-0000-0000-0000000000a2'),
  0,
  'a Raggställe asked to be shared with everyone is still friends-only'
);

select tests.login_as('d3000000-0000-0000-0000-000000000034');

select is(
  (select count(*)::int from public.spots where id = 'a3000000-0000-0000-0000-0000000000a2'),
  0,
  'Dan (blocked by Alice) never sees her spots, even public ones'
);

select tests.login_as('c3000000-0000-0000-0000-000000000033');

select throws_ok(
  $$insert into public.spots (creator_id, kind, name, lat, lng)
    values ('a3000000-0000-0000-0000-000000000031', 'ragg', 'Fake', 59.3, 18.1)$$,
  '42501',
  null,
  'Carol cannot create a spot in Alice''s name'
);

select throws_ok(
  $$insert into public.spots (creator_id, kind, lat, lng)
    values ('c3000000-0000-0000-0000-000000000033', 'ragg', 59.3, 18.1)$$,
  '23514',
  null,
  'A Raggställe needs a name'
);

select lives_ok(
  $$insert into public.spots (creator_id, kind, warning_type, lat, lng, visibility)
    values ('c3000000-0000-0000-0000-000000000033', 'varning', 'vagarbete', 59.3, 18.1, 'all')$$,
  'Carol can drop her own warning'
);

select tests.login_as('b3000000-0000-0000-0000-000000000032');

delete from public.spots where id = 'a3000000-0000-0000-0000-0000000000a1';

select tests.login_as('a3000000-0000-0000-0000-000000000031');

select is(
  (select count(*)::int from public.spots where id = 'a3000000-0000-0000-0000-0000000000a1'),
  1,
  'Bob cannot delete Alice''s spot'
);

delete from public.spots where id = 'a3000000-0000-0000-0000-0000000000a1';

select is(
  (select count(*)::int from public.spots where id = 'a3000000-0000-0000-0000-0000000000a1'),
  0,
  'Alice can delete her own spot'
);

select * from finish();

rollback;
