begin;

select plan(37);

select tests.create_user('ad000001-0000-0000-0000-000000000001', 'test-adm-owner', 'Owner');
select tests.create_user('ad000002-0000-0000-0000-000000000002', 'test-adm-friend', 'Friend');
select tests.create_user('ad000003-0000-0000-0000-000000000003', 'test-adm-stranger', 'Stranger');
select tests.create_user('ad000004-0000-0000-0000-000000000004', 'test-adm-admin', 'Admin');

insert into public.friendships (requester_id, addressee_id, status) values
  ('ad000001-0000-0000-0000-000000000001', 'ad000002-0000-0000-0000-000000000002', 'accepted');

insert into public.admins (user_id) values ('ad000004-0000-0000-0000-000000000004');

insert into public.posts (id, author_id, body, image_url) values
  ('ad0000b1-0000-0000-0000-000000000001', 'ad000001-0000-0000-0000-000000000001',
   'Elak post', 'ad000001-0000-0000-0000-000000000001/post.jpg');

insert into public.spots (id, creator_id, kind, name, lat, lng) values
  ('ad0000a1-0000-0000-0000-000000000001', 'ad000001-0000-0000-0000-000000000001', 'ragg', 'Max', 59.3, 18.1);

insert into public.locations (user_id, lat, lng, sharing_enabled, status_text) values
  ('ad000001-0000-0000-0000-000000000001', 59.3, 18.1, true, 'Elak status');

insert into public.reports (id, reporter_id, reported_user_id, target_type, target_id, reason, snapshot) values
  ('ad0000f1-0000-0000-0000-000000000001', 'ad000002-0000-0000-0000-000000000002',
   'ad000001-0000-0000-0000-000000000001', 'post', 'ad0000b1-0000-0000-0000-000000000001', 'hat', 'Elak post'),
  ('ad0000f2-0000-0000-0000-000000000002', 'ad000002-0000-0000-0000-000000000002',
   'ad000001-0000-0000-0000-000000000001', 'status', 'ad000001-0000-0000-0000-000000000001', 'mobbning', 'Status: Elak status'),
  ('ad0000f3-0000-0000-0000-000000000003', 'ad000002-0000-0000-0000-000000000002',
   'ad000001-0000-0000-0000-000000000001', 'spot', 'ad0000a1-0000-0000-0000-000000000001', 'spam', 'Max');

select tests.login_anon();

select throws_ok($$select count(*) from public.admins$$, '42501', null, 'a logged-out caller cannot read admins');
select throws_ok($$select public.is_admin()$$, '42501', null, 'a logged-out caller cannot call is_admin');
select throws_ok($$select * from public.admin_open_reports()$$, '42501', null, 'a logged-out caller cannot list reports');
select throws_ok(
  $$select public.admin_remove_reported_content('ad0000f1-0000-0000-0000-000000000001')$$,
  '42501', null, 'a logged-out caller cannot remove content'
);

select tests.login_as('ad000003-0000-0000-0000-000000000003');

select is(public.is_admin(), false, 'a stranger is not admin');
select is((select count(*)::int from public.reports), 0, 'a stranger sees no reports');
select throws_ok($$select * from public.admin_open_reports()$$, '42501', null, 'a stranger cannot list reports');
select throws_ok(
  $$select public.admin_remove_reported_content('ad0000f1-0000-0000-0000-000000000001')$$,
  '42501', null, 'a stranger cannot remove content'
);
select throws_ok(
  $$insert into public.admins (user_id) values ('ad000003-0000-0000-0000-000000000003')$$,
  '42501', null, 'a stranger cannot make themselves admin'
);
select throws_ok($$select count(*) from public.admins$$, '42501', null, 'a stranger cannot read admins');

select throws_ok(
  $$update public.reports set status = 'handled' where id = 'ad0000f1-0000-0000-0000-000000000001'$$,
  '42501', null, 'a stranger cannot update a report'
);
select throws_ok(
  $$select public.admin_mark_report_handled('ad0000f1-0000-0000-0000-000000000001')$$,
  '42501', null, 'a stranger cannot mark a report handled'
);

select tests.login_as('ad000002-0000-0000-0000-000000000002');

select is((select count(*)::int from public.reports), 3, 'the reporter sees only their own reports');
select throws_ok($$select * from public.admin_open_reports()$$, '42501', null, 'a friend cannot list reports');
select throws_ok(
  $$select public.admin_remove_reported_content('ad0000f1-0000-0000-0000-000000000001')$$,
  '42501', null, 'a friend cannot remove content'
);

select throws_ok(
  $$update public.reports set status = 'handled' where id = 'ad0000f1-0000-0000-0000-000000000001'$$,
  '42501', null, 'the reporter cannot update a report'
);
select throws_ok(
  $$select public.admin_mark_report_handled('ad0000f1-0000-0000-0000-000000000001')$$,
  '42501', null, 'a friend cannot mark a report handled'
);

select tests.login_as('ad000001-0000-0000-0000-000000000001');

select is((select count(*)::int from public.reports), 0, 'the reported owner sees no reports');
select throws_ok($$select * from public.admin_open_reports()$$, '42501', null, 'the owner cannot list reports');
select throws_ok(
  $$select public.admin_mark_report_handled('ad0000f1-0000-0000-0000-000000000001')$$,
  '42501', null, 'the owner cannot mark a report handled'
);
select throws_ok(
  $$insert into public.admins (user_id) values ('ad000001-0000-0000-0000-000000000001')$$,
  '42501', null, 'the owner cannot make themselves admin'
);

select tests.logout();

select is(
  (select count(*)::int from public.reports where reporter_id = 'ad000002-0000-0000-0000-000000000002' and status = 'open'),
  3,
  'nobody but an admin changed a report status'
);

select tests.login_as('ad000004-0000-0000-0000-000000000004');

select is(public.is_admin(), true, 'the admin is admin');
select is((select count(*)::int from public.admin_open_reports()), 3, 'the admin lists all open reports');
select is(
  (select reported_username from public.admin_open_reports() where id = 'ad0000f1-0000-0000-0000-000000000001'),
  'test-adm-owner',
  'the list shows who was reported'
);
select is((select count(*)::int from public.posts where id = 'ad0000b1-0000-0000-0000-000000000001'), 0,
  'the admin does not see a non-friend post through normal access');
select is((select count(*)::int from public.spots where id = 'ad0000a1-0000-0000-0000-000000000001'), 0,
  'the admin does not see a non-friend spot on the map');
select throws_ok(
  $$insert into public.admins (user_id) values ('ad000003-0000-0000-0000-000000000003')$$,
  '42501', null, 'the admin cannot add admins from the app'
);

select lives_ok(
  $$select public.admin_mark_report_handled('ad0000f3-0000-0000-0000-000000000003')$$,
  'the admin marks a report handled'
);

select is(public.admin_remove_reported_content('ad0000f1-0000-0000-0000-000000000001'), true,
  'the admin removes a reported post');
select is(public.admin_remove_reported_content('ad0000f2-0000-0000-0000-000000000002'), true,
  'the admin removes a reported status');
select is((select count(*)::int from public.admin_open_reports()), 0, 'no open reports are left');

select tests.logout();

select is((select count(*)::int from public.posts where id = 'ad0000b1-0000-0000-0000-000000000001'), 0, 'the post is gone');
select is(
  (select count(*)::int from public.storage_cleanup where bucket = 'post-images' and path = 'ad000001-0000-0000-0000-000000000001/post.jpg'),
  1,
  'the post picture is queued for removal'
);
select is(
  (select status from public.reports where id = 'ad0000f3-0000-0000-0000-000000000003'),
  'handled',
  'the handled report is closed'
);
select is(
  (select status_text from public.locations where user_id = 'ad000001-0000-0000-0000-000000000001'),
  null,
  'the status is cleared'
);
select is((select count(*)::int from public.spots where id = 'ad0000a1-0000-0000-0000-000000000001'), 1,
  'marking a report handled keeps the content');

select * from finish();

rollback;
