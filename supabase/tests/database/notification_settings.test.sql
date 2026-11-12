begin;

select plan(10);

select tests.create_user('6c000001-0000-0000-0000-000000000000', 'test-notif-owner', 'Owner');
select tests.create_user('6c000002-0000-0000-0000-000000000000', 'test-notif-friend', 'Friend');
select tests.create_user('6c000003-0000-0000-0000-000000000000', 'test-notif-stranger', 'Stranger');

insert into public.friendships (requester_id, addressee_id, status) values
  ('6c000001-0000-0000-0000-000000000000', '6c000002-0000-0000-0000-000000000000', 'accepted');

select tests.login_as('6c000001-0000-0000-0000-000000000000');

select lives_ok(
  $$insert into public.notification_settings (user_id, messages) values ('6c000001-0000-0000-0000-000000000000', false)$$,
  'the owner can save their own settings'
);

select throws_ok(
  $$insert into public.notification_settings (user_id) values ('6c000003-0000-0000-0000-000000000000')$$,
  '42501',
  null,
  'the owner cannot create settings for someone else'
);

select lives_ok(
  $$update public.notification_settings set meets = false where user_id = '6c000001-0000-0000-0000-000000000000'$$,
  'the owner can change their own settings'
);

select results_eq(
  $$select messages, friend_requests, meets from public.notification_settings$$,
  $$values (false, true, false)$$,
  'the owner reads their own settings'
);

select throws_ok(
  $$delete from public.notification_settings$$,
  '42501',
  null,
  'settings cannot be deleted from the app'
);

select tests.login_as('6c000002-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.notification_settings),
  0,
  'a friend sees no settings'
);

update public.notification_settings set messages = true where user_id = '6c000001-0000-0000-0000-000000000000';

select tests.login_as('6c000003-0000-0000-0000-000000000000');

select is(
  (select count(*)::int from public.notification_settings),
  0,
  'a stranger sees no settings'
);

select tests.logout();

select is(
  (select messages from public.notification_settings where user_id = '6c000001-0000-0000-0000-000000000000'),
  false,
  'a friend cannot change the owner''s settings'
);

select tests.login_anon();

select throws_ok(
  $$select count(*) from public.notification_settings$$,
  '42501',
  null,
  'a logged-out user cannot read settings'
);

select throws_ok(
  $$insert into public.notification_settings (user_id) values ('6c000001-0000-0000-0000-000000000000')$$,
  '42501',
  null,
  'a logged-out user cannot write settings'
);

select * from finish();

rollback;
