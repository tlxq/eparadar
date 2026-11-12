begin;

select plan(14);

select tests.create_user('c2000001-0000-0000-0000-000000000001', 'test-px-me', 'PxMe');
select tests.create_user('c2000002-0000-0000-0000-000000000001', 'test-px-friend', 'PxFriend');
select tests.create_user('c2000003-0000-0000-0000-000000000001', 'test-px-stranger', 'PxStranger');

insert into public.friendships (requester_id, addressee_id, status) values
  ('c2000001-0000-0000-0000-000000000001', 'c2000002-0000-0000-0000-000000000001', 'accepted');

insert into public.profile_bios (user_id, bio) values
  ('c2000001-0000-0000-0000-000000000001', 'px me bio'),
  ('c2000002-0000-0000-0000-000000000001', 'px friend bio');

insert into public.cars (owner_id, make, model) values
  ('c2000002-0000-0000-0000-000000000001', 'Volvo', 'PxFriendCar');

insert into storage.objects (bucket_id, name, owner_id) values
  ('car-photos', 'c2000001-0000-0000-0000-000000000001/car.jpg', 'c2000001-0000-0000-0000-000000000001');

select is(
  (select public from storage.buckets where id = 'car-photos'),
  false,
  'car photos are in a private bucket'
);

select tests.login_as('c2000001-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from storage.objects where bucket_id = 'car-photos'),
  1,
  'owner sees own car photo'
);

select tests.login_as('c2000002-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from storage.objects where bucket_id = 'car-photos'),
  1,
  'kompis sees the car photo'
);

select tests.login_as('c2000003-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from storage.objects where bucket_id = 'car-photos'),
  0,
  'stranger cannot see the car photo'
);

select tests.login_anon();

select is(
  (select count(*)::int from storage.objects where bucket_id = 'car-photos'),
  0,
  'logged out cannot see the car photo'
);

select tests.login_as('c2000003-0000-0000-0000-000000000001');

update public.profiles set display_name = 'PxStranger2', bio = '  old build bio  '
where id = 'c2000003-0000-0000-0000-000000000001';

select is(
  (select bio from public.profiles where id = 'c2000003-0000-0000-0000-000000000001'),
  null,
  'an old build writing profiles.bio leaves the column empty'
);

select is(
  (select bio from public.profile_bios where user_id = 'c2000003-0000-0000-0000-000000000001'),
  'old build bio',
  'the old build bio lands in profile_bios'
);

select lives_ok(
  $$ select public.update_my_profile('PxStranger3', 'new bio') $$,
  'update_my_profile saves card and bio'
);

select is(
  (select bio from public.profile_bios where user_id = 'c2000003-0000-0000-0000-000000000001'),
  'new bio',
  'update_my_profile writes the bio'
);

select tests.login_anon();

select throws_ok(
  $$ select public.update_my_profile('x', 'y') $$,
  '42501',
  null,
  'logged out cannot call update_my_profile'
);

select tests.login_as('c2000003-0000-0000-0000-000000000001');

select lives_ok(
  $$ select public.report_content('profile', 'c2000002-0000-0000-0000-000000000001', 'spam', null) $$,
  'a stranger can report a profile'
);

select tests.logout();

select ok(
  (select snapshot like '%px friend bio%' from public.reports
   where target_id = 'c2000002-0000-0000-0000-000000000001' and target_type = 'profile'),
  'the report snapshot has the bio'
);

select tests.login_as('c2000001-0000-0000-0000-000000000001');

select ok(
  (public.export_my_data() -> 'profile' ->> 'bio') = 'px me bio',
  'the data export includes the bio'
);

select tests.logout();

update public.friendships set status = 'blocked', blocked_by = 'c2000001-0000-0000-0000-000000000001'
where requester_id = 'c2000001-0000-0000-0000-000000000001'
  and addressee_id = 'c2000002-0000-0000-0000-000000000001';

select tests.login_as('c2000001-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.profile_bios where user_id = 'c2000002-0000-0000-0000-000000000001')
  + (select count(*)::int from public.cars where owner_id = 'c2000002-0000-0000-0000-000000000001'),
  0,
  'a kompis who gets blocked loses bio and cars'
);

select * from finish();
rollback;
