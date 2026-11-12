begin;

select plan(13);

select tests.create_user('68f10001-0000-0000-0000-000000000001', 'test-drop-alice', 'DropAlice');
select tests.create_user('68f10002-0000-0000-0000-000000000001', 'test-drop-bob', 'DropBob');
select tests.create_user('68f10003-0000-0000-0000-000000000001', 'test-drop-carol', 'DropCarol');

insert into public.friendships (requester_id, addressee_id, status) values
  ('68f10001-0000-0000-0000-000000000001', '68f10002-0000-0000-0000-000000000001', 'accepted');

insert into public.posts (id, author_id, body, created_at) values
  ('68f100a1-0000-0000-0000-000000000001', '68f10001-0000-0000-0000-000000000001', 'Här är vi', now()),
  ('68f100a2-0000-0000-0000-000000000001', '68f10001-0000-0000-0000-000000000001', 'Gammal', now() - interval '3 hours'),
  ('68f100a3-0000-0000-0000-000000000001', '68f10001-0000-0000-0000-000000000001', 'Igår', now());

select tests.login_as('68f10001-0000-0000-0000-000000000001');

select lives_ok(
  $$insert into public.post_places (post_id, author_id, lat, lng, expires_at)
    values ('68f100a1-0000-0000-0000-000000000001', '68f10001-0000-0000-0000-000000000001', 59.3, 18.1, now() + interval '30 days')$$,
  'The author drops her new post on the map'
);

select ok(
  (select expires_at - created_at = interval '24 hours' from public.post_places
   where post_id = '68f100a1-0000-0000-0000-000000000001'),
  'A dropped post stays on the map for 24 hours, whatever the client asks for'
);

select throws_ok(
  $$insert into public.post_places (post_id, author_id, lat, lng)
    values ('68f100a2-0000-0000-0000-000000000001', '68f10001-0000-0000-0000-000000000001', 59.3, 18.1)$$,
  '42501',
  null,
  'Old posts cannot be dropped on the map afterwards'
);

select tests.logout();
insert into public.post_places (post_id, author_id, lat, lng)
values ('68f100a3-0000-0000-0000-000000000001', '68f10001-0000-0000-0000-000000000001', 59.4, 18.2);
update public.post_places set expires_at = now() - interval '1 minute'
where post_id = '68f100a3-0000-0000-0000-000000000001';
set local role authenticated;

select is(
  (select count(*)::int from public.post_places),
  1,
  'The author does not see her expired place'
);

select tests.login_as('68f10002-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.post_places),
  1,
  'A friend sees the live place but not the expired one'
);

select throws_ok(
  $$insert into public.post_places (post_id, author_id, lat, lng)
    values ('68f100a1-0000-0000-0000-000000000001', '68f10002-0000-0000-0000-000000000001', 59.3, 18.1)$$,
  '42501',
  null,
  'A friend cannot drop someone else''s post'
);

delete from public.post_places where post_id = '68f100a1-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.post_places),
  1,
  'A friend cannot remove the author''s place'
);

select tests.login_as('68f10003-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from public.post_places),
  0,
  'A stranger sees no places'
);

select tests.logout();
select tests.login_anon();

select throws_ok(
  $$select count(*) from public.post_places$$,
  '42501',
  null,
  'Logged-out users see no places'
);

select tests.logout();

select public.purge_expired_post_places();

select is(
  (select count(*)::int from public.post_places where post_id = '68f100a3-0000-0000-0000-000000000001'),
  0,
  'The purge job deletes expired places'
);

select is(
  (select count(*)::int from public.post_places where post_id = '68f100a1-0000-0000-0000-000000000001'),
  1,
  'The purge job keeps live places'
);

select ok(
  exists (select 1 from cron.job where jobname = 'purge-expired-post-places'),
  'Expired places are purged on a schedule'
);

insert into public.locations (user_id, sharing_enabled, approximate_enabled)
values ('68f10002-0000-0000-0000-000000000001', false, true)
on conflict (user_id) do update set approximate_enabled = true;

insert into public.posts (id, author_id, body) values
  ('68f100a4-0000-0000-0000-000000000001', '68f10002-0000-0000-0000-000000000001', 'Ungefär här');

insert into public.post_places (post_id, author_id, lat, lng)
values ('68f100a4-0000-0000-0000-000000000001', '68f10002-0000-0000-0000-000000000001', 59.30123, 18.10456);

select ok(
  (select abs(lat - 59.301) < 0.0001 and abs(lng - 18.105) < 0.0001 from public.post_places
   where post_id = '68f100a4-0000-0000-0000-000000000001'),
  'People with approximate position get a rounded place'
);

select * from finish();

rollback;
