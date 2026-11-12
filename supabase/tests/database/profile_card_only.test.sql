begin;

select plan(19);

select tests.create_user('c1000001-0000-0000-0000-000000000001', 'test-pc-me', 'PcMe');
select tests.create_user('c1000002-0000-0000-0000-000000000001', 'test-pc-friend', 'PcFriend');
select tests.create_user('c1000003-0000-0000-0000-000000000001', 'test-pc-stranger', 'PcStranger');
select tests.create_user('c1000004-0000-0000-0000-000000000001', 'test-pc-blocked', 'PcBlocked');

insert into public.friendships (requester_id, addressee_id, status, blocked_by) values
  ('c1000001-0000-0000-0000-000000000001', 'c1000002-0000-0000-0000-000000000001', 'accepted', null),
  ('c1000001-0000-0000-0000-000000000001', 'c1000004-0000-0000-0000-000000000001', 'blocked', 'c1000001-0000-0000-0000-000000000001');

insert into public.profile_bios (user_id, bio) values
  ('c1000001-0000-0000-0000-000000000001', 'pc me bio'),
  ('c1000002-0000-0000-0000-000000000001', 'pc friend bio'),
  ('c1000003-0000-0000-0000-000000000001', 'pc stranger bio'),
  ('c1000004-0000-0000-0000-000000000001', 'pc blocked bio');

insert into public.cars (owner_id, make, model) values
  ('c1000001-0000-0000-0000-000000000001', 'Volvo', 'PcMeCar'),
  ('c1000002-0000-0000-0000-000000000001', 'Volvo', 'PcFriendCar'),
  ('c1000003-0000-0000-0000-000000000001', 'Volvo', 'PcStrangerCar'),
  ('c1000004-0000-0000-0000-000000000001', 'Volvo', 'PcBlockedCar');

select tests.login_as('c1000001-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.profiles where id::text like 'c100000%'),
  4,
  'everyone logged in sees the profile card, strangers and blocked included'
);

select is(
  (select count(*)::int from public.profile_bios where user_id::text like 'c100000%'),
  2,
  'owner sees own bio and the friend bio only'
);

select is(
  (select bio from public.profile_bios where user_id = 'c1000002-0000-0000-0000-000000000001'),
  'pc friend bio',
  'friend bio is readable'
);

select is(
  (select count(*)::int from public.profile_bios
   where user_id in ('c1000003-0000-0000-0000-000000000001', 'c1000004-0000-0000-0000-000000000001')),
  0,
  'stranger and blocked bios are hidden'
);

select is(
  (select count(*)::int from public.cars where owner_id::text like 'c100000%'),
  2,
  'owner sees own cars and the friend cars only'
);

select is(
  (select count(*)::int from public.cars
   where owner_id in ('c1000003-0000-0000-0000-000000000001', 'c1000004-0000-0000-0000-000000000001')),
  0,
  'stranger and blocked cars are hidden'
);

select is(
  (select count(*)::int from public.profiles p
   where p.id = 'c1000003-0000-0000-0000-000000000001' and p.username is not null and p.display_name is not null),
  1,
  'stranger card has username and display name'
);

select tests.login_as('c1000003-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.profiles where id::text like 'c100000%'),
  4,
  'stranger sees all cards'
);

select is(
  (select count(*)::int from public.profile_bios where user_id::text like 'c100000%'),
  1,
  'stranger sees only own bio'
);

select is(
  (select count(*)::int from public.cars where owner_id::text like 'c100000%'),
  1,
  'stranger sees only own cars'
);

select tests.login_as('c1000004-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.profile_bios where user_id <> 'c1000004-0000-0000-0000-000000000001'
     and user_id::text like 'c100000%'),
  0,
  'blocked user sees no other bios'
);

select is(
  (select count(*)::int from public.cars where owner_id <> 'c1000004-0000-0000-0000-000000000001'
     and owner_id::text like 'c100000%'),
  0,
  'blocked user sees no other cars'
);

select tests.login_as('c1000002-0000-0000-0000-000000000001');

select is(
  (select bio from public.profile_bios where user_id = 'c1000001-0000-0000-0000-000000000001'),
  'pc me bio',
  'friend sees the owner bio'
);

select is(
  (select count(*)::int from public.cars where owner_id = 'c1000001-0000-0000-0000-000000000001'),
  1,
  'friend sees the owner cars'
);

select is_empty(
  $$ update public.profile_bios set bio = 'hacked' where user_id = 'c1000001-0000-0000-0000-000000000001' returning 1 $$,
  'friend cannot edit someone else bio'
);

select throws_ok(
  $$ insert into public.profile_bios (user_id, bio) values ('c1000003-0000-0000-0000-000000000001', 'x') $$,
  '42501',
  null,
  'cannot write a bio for someone else'
);

select tests.logout();
select tests.login_anon();

select throws_ok(
  $$ select count(*) from public.profile_bios $$,
  '42501',
  null,
  'logged out cannot read bios'
);

select throws_ok(
  $$ select count(*) from public.cars $$,
  '42501',
  null,
  'logged out cannot read cars'
);

select throws_ok(
  $$ select count(*) from public.profiles $$,
  '42501',
  null,
  'logged out cannot read profiles'
);

select * from finish();
rollback;
