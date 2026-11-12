begin;

select plan(12);

select tests.create_user('4e000001-0000-0000-0000-000000000001', 'test-rep-alice', 'Alice');
select tests.create_user('4e000002-0000-0000-0000-000000000002', 'test-rep-bob', 'Bob');
select tests.create_user('4e000003-0000-0000-0000-000000000003', 'test-rep-carol', 'Carol');

insert into public.friendships (requester_id, addressee_id, status) values
  ('4e000001-0000-0000-0000-000000000001', '4e000002-0000-0000-0000-000000000002', 'accepted');

insert into public.posts (id, author_id, body) values
  ('4e0000b1-0000-0000-0000-000000000001', '4e000001-0000-0000-0000-000000000001', 'Elakt inlägg');

select tests.login_anon();

select throws_ok(
  $$select public.report_content('post', '4e0000b1-0000-0000-0000-000000000001', 'hat')$$,
  '42501',
  null,
  'a logged-out caller cannot report'
);

select throws_ok(
  $$select count(*) from public.reports$$,
  '42501',
  null,
  'a logged-out caller reads no reports'
);

select tests.login_as('4e000003-0000-0000-0000-000000000003');

select throws_ok(
  $$select public.report_content('post', '4e0000b1-0000-0000-0000-000000000001', 'hat')$$,
  'P0001',
  'Hittade inte det du vill rapportera.',
  'a stranger cannot report a post they cannot see'
);

select lives_ok(
  $$select public.report_content('profile', '4e000001-0000-0000-0000-000000000001', 'mobbning', 'Skriver elakt')$$,
  'a stranger can report a profile'
);

select throws_ok(
  $$insert into public.reports (reporter_id, target_type, target_id, reason)
    values ('4e000002-0000-0000-0000-000000000002', 'profile', '4e000001-0000-0000-0000-000000000001', 'spam')$$,
  '42501',
  null,
  'nobody can file a report in someone else''s name'
);

select tests.login_as('4e000002-0000-0000-0000-000000000002');

select lives_ok(
  $$select public.report_content('post', '4e0000b1-0000-0000-0000-000000000001', 'hat', 'Inte okej')$$,
  'a friend can report a post they can see'
);

select lives_ok(
  $$select public.report_content('post', '4e0000b1-0000-0000-0000-000000000001', 'hat')$$,
  'reporting the same thing twice is harmless'
);

select is(
  (select count(*)::int from public.reports),
  1,
  'a reporter only sees their own reports, once'
);

select is(
  (select snapshot from public.reports where target_type = 'post'),
  'Elakt inlägg',
  'the report keeps a copy of what was reported'
);

select throws_ok(
  $$update public.reports set status = 'handled'$$,
  '42501',
  null,
  'a reporter cannot change a report'
);

select tests.login_as('4e000001-0000-0000-0000-000000000001');

select throws_ok(
  $$select public.report_content('post', '4e0000b1-0000-0000-0000-000000000001', 'hat')$$,
  'P0001',
  'Du kan inte rapportera dig själv.',
  'the owner cannot report their own post'
);

select is((select count(*)::int from public.reports), 0, 'the reported person cannot see reports about them');

select * from finish();

rollback;
