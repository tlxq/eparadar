begin;

select plan(9);

insert into auth.users (id) values
  ('30000001-0000-0000-0000-000000000001'),
  ('30000002-0000-0000-0000-000000000001'),
  ('30000003-0000-0000-0000-000000000001'),
  ('30000004-0000-0000-0000-000000000001'),
  ('30000005-0000-0000-0000-000000000001'),
  ('40000001-0000-0000-0000-000000000001'),
  ('40000002-0000-0000-0000-000000000001'),
  ('40000003-0000-0000-0000-000000000001'),
  ('40000004-0000-0000-0000-000000000001');

insert into public.profiles (id, username, display_name) values
  ('30000001-0000-0000-0000-000000000001', 'test-meetup-a', 'MeetupA'),
  ('30000002-0000-0000-0000-000000000001', 'test-meetup-b', 'MeetupB'),
  ('30000003-0000-0000-0000-000000000001', 'test-meetup-c', 'MeetupC'),
  ('30000004-0000-0000-0000-000000000001', 'test-meetup-d', 'MeetupD'),
  ('30000005-0000-0000-0000-000000000001', 'test-meetup-e', 'MeetupE'),
  ('40000001-0000-0000-0000-000000000001', 'test-mutual-a', 'MutualA'),
  ('40000002-0000-0000-0000-000000000001', 'test-mutual-b', 'MutualB'),
  ('40000003-0000-0000-0000-000000000001', 'test-mutual-c', 'MutualC'),
  ('40000004-0000-0000-0000-000000000001', 'test-mutual-d', 'MutualD')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.meetups (id, creator_id, title, lat, lng, starts_at) values
  ('30000001-1111-0000-0000-000000000001', '30000001-0000-0000-0000-000000000001', 'Delad träff', 57.7, 11.9, now()),
  ('30000001-1111-0000-0000-000000000002', '30000001-0000-0000-0000-000000000001', 'Annan träff', 57.7, 11.9, now());

insert into public.meetup_checkins (meetup_id, user_id) values
  ('30000001-1111-0000-0000-000000000001', '30000001-0000-0000-0000-000000000001'),
  ('30000001-1111-0000-0000-000000000001', '30000002-0000-0000-0000-000000000001'),
  ('30000001-1111-0000-0000-000000000001', '30000003-0000-0000-0000-000000000001'),
  ('30000001-1111-0000-0000-000000000001', '30000005-0000-0000-0000-000000000001'),
  ('30000001-1111-0000-0000-000000000002', '30000004-0000-0000-0000-000000000001');

insert into public.friendships (requester_id, addressee_id, status) values
  ('30000001-0000-0000-0000-000000000001', '30000003-0000-0000-0000-000000000001', 'accepted');

insert into public.friendships (requester_id, addressee_id, status, blocked_by) values
  ('30000001-0000-0000-0000-000000000001', '30000005-0000-0000-0000-000000000001', 'blocked', '30000001-0000-0000-0000-000000000001');

insert into public.friendships (requester_id, addressee_id, status) values
  ('40000001-0000-0000-0000-000000000001', '40000002-0000-0000-0000-000000000001', 'accepted'),
  ('40000002-0000-0000-0000-000000000001', '40000003-0000-0000-0000-000000000001', 'accepted'),
  ('40000002-0000-0000-0000-000000000001', '40000004-0000-0000-0000-000000000001', 'accepted');

insert into public.friendships (requester_id, addressee_id, status, blocked_by) values
  ('40000001-0000-0000-0000-000000000001', '40000004-0000-0000-0000-000000000001', 'blocked', '40000001-0000-0000-0000-000000000001');

set local role authenticated;
set local request.jwt.claim.sub = '30000001-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.suggested_friends_from_meetups() where user_id = '30000002-0000-0000-0000-000000000001'),
  1,
  'a co-attendee with no existing relationship appears as a meetup suggestion'
);

select is(
  (select shared_meetup_count from public.suggested_friends_from_meetups() where user_id = '30000002-0000-0000-0000-000000000001'),
  1,
  'shared_meetup_count reflects the one shared meetup'
);

select is(
  (select count(*)::int from public.suggested_friends_from_meetups() where user_id = '30000003-0000-0000-0000-000000000001'),
  0,
  'an already-accepted friend is excluded from meetup suggestions'
);

select is(
  (select count(*)::int from public.suggested_friends_from_meetups() where user_id = '30000005-0000-0000-0000-000000000001'),
  0,
  'a blocked user is excluded from meetup suggestions even if co-attended'
);

select is(
  (select count(*)::int from public.suggested_friends_from_meetups() where user_id = '30000004-0000-0000-0000-000000000001'),
  0,
  'a user who only attended a different meetup is not suggested'
);

set local request.jwt.claim.sub = '40000001-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.suggested_friends_mutual() where user_id = '40000003-0000-0000-0000-000000000001'),
  1,
  'a friend-of-friend with no existing relationship appears as a mutual suggestion'
);

select is(
  (select mutual_friend_count from public.suggested_friends_mutual() where user_id = '40000003-0000-0000-0000-000000000001'),
  1,
  'mutual_friend_count reflects the one shared connector'
);

select is(
  (select count(*)::int from public.suggested_friends_mutual() where user_id = '40000002-0000-0000-0000-000000000001'),
  0,
  'an already-direct friend is excluded from mutual suggestions'
);

select is(
  (select count(*)::int from public.suggested_friends_mutual() where user_id = '40000004-0000-0000-0000-000000000001'),
  0,
  'a blocked friend-of-friend is excluded from mutual suggestions'
);

select * from finish();

rollback;
