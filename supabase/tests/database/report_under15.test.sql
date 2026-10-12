begin;

select plan(9);

insert into auth.users (id) values
  ('6dd00001-0000-0000-0000-000000000001'),
  ('6dd00002-0000-0000-0000-000000000002'),
  ('6dd00003-0000-0000-0000-000000000003');

insert into public.profiles (id, username, display_name) values
  ('6dd00001-0000-0000-0000-000000000001', 'test-u15-owner', 'Owner'),
  ('6dd00002-0000-0000-0000-000000000002', 'test-u15-friend', 'Friend'),
  ('6dd00003-0000-0000-0000-000000000003', 'test-u15-stranger', 'Stranger')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('6dd00001-0000-0000-0000-000000000001', '6dd00002-0000-0000-0000-000000000002', 'accepted');

insert into public.posts (id, author_id, body) values
  ('6dd000b1-0000-0000-0000-000000000001', '6dd00001-0000-0000-0000-000000000001', 'Min första post');

set local role anon;

select throws_ok(
  $$select public.report_content('profile', '6dd00001-0000-0000-0000-000000000001', 'under15')$$,
  '42501',
  null,
  'a logged-out caller cannot report someone as under 15'
);

select is((select count(*)::int from public.reports), 0, 'a logged-out caller reads no reports');

set local role authenticated;
set local request.jwt.claim.sub = '6dd00003-0000-0000-0000-000000000003';

select lives_ok(
  $$select public.report_content('profile', '6dd00001-0000-0000-0000-000000000001', 'under15', 'Sa att hen går i sexan')$$,
  'a stranger can report a profile as under 15'
);

select throws_ok(
  $$select public.report_content('profile', '6dd00001-0000-0000-0000-000000000001', 'under12')$$,
  '23514',
  null,
  'an unknown reason is still rejected'
);

set local request.jwt.claim.sub = '6dd00002-0000-0000-0000-000000000002';

select is((select count(*)::int from public.reports), 0, 'a friend does not see the stranger''s report');

select lives_ok(
  $$select public.report_content('post', '6dd000b1-0000-0000-0000-000000000001', 'under15')$$,
  'a friend can report a post as under 15'
);

select is(
  (select reason from public.reports where target_type = 'post'),
  'under15',
  'the reason is stored'
);

set local request.jwt.claim.sub = '6dd00001-0000-0000-0000-000000000001';

select is((select count(*)::int from public.reports), 0, 'the owner cannot see reports about them');

reset role;

select is(
  (select count(*)::int from public.reports where reason = 'under15'
    and reported_user_id = '6dd00001-0000-0000-0000-000000000001'),
  2,
  'both under-15 reports reach the moderation queue'
);

select * from finish();

rollback;
