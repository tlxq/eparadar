begin;

select plan(10);

insert into auth.users (id) values
  ('a9000001-0000-0000-0000-000000000001'),
  ('a9000002-0000-0000-0000-000000000001'),
  ('a9000003-0000-0000-0000-000000000001');

insert into public.profiles (id, username, display_name) values
  ('a9000001-0000-0000-0000-000000000001', 'test-delacc-x', 'DelAccX'),
  ('a9000002-0000-0000-0000-000000000001', 'test-delacc-y', 'DelAccY'),
  ('a9000003-0000-0000-0000-000000000001', 'test-delacc-z', 'DelAccZ')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.conversations (id, is_group, name) values
  ('a9000000-1111-0000-0000-000000000001', false, null),
  ('a9000000-1111-0000-0000-000000000002', true, 'Kvar'),
  ('a9000000-1111-0000-0000-000000000003', true, 'Ensam');

insert into public.conversation_members (conversation_id, user_id, role, joined_at) values
  ('a9000000-1111-0000-0000-000000000001', 'a9000001-0000-0000-0000-000000000001', 'member', now() - interval '3 days'),
  ('a9000000-1111-0000-0000-000000000001', 'a9000002-0000-0000-0000-000000000001', 'member', now() - interval '3 days'),
  ('a9000000-1111-0000-0000-000000000002', 'a9000001-0000-0000-0000-000000000001', 'admin', now() - interval '3 days'),
  ('a9000000-1111-0000-0000-000000000002', 'a9000003-0000-0000-0000-000000000001', 'member', now() - interval '2 days'),
  ('a9000000-1111-0000-0000-000000000002', 'a9000002-0000-0000-0000-000000000001', 'member', now() - interval '1 day'),
  ('a9000000-1111-0000-0000-000000000003', 'a9000001-0000-0000-0000-000000000001', 'admin', now());

insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', 'a9000001-0000-0000-0000-000000000001/avatar.jpg', 'a9000001-0000-0000-0000-000000000001'),
  ('avatars', 'a9000002-0000-0000-0000-000000000001/avatar.jpg', 'a9000002-0000-0000-0000-000000000001'),
  ('chat-images', 'a9000000-1111-0000-0000-000000000001/fran-y.jpg', 'a9000002-0000-0000-0000-000000000001'),
  ('chat-images', 'a9000000-1111-0000-0000-000000000002/fran-x.jpg', 'a9000001-0000-0000-0000-000000000001'),
  ('chat-images', 'a9000000-1111-0000-0000-000000000002/fran-z.jpg', 'a9000003-0000-0000-0000-000000000001'),
  ('group-avatars', 'a9000000-1111-0000-0000-000000000002/1.jpg', 'a9000001-0000-0000-0000-000000000001'),
  ('group-avatars', 'a9000000-1111-0000-0000-000000000003/1.jpg', 'a9000001-0000-0000-0000-000000000001');

create temp table doomed_files as
select bucket || ':' || path as file
from public.prepare_account_deletion('a9000001-0000-0000-0000-000000000001');

select set_eq(
  'select file from doomed_files',
  array[
    'avatars:a9000001-0000-0000-0000-000000000001/avatar.jpg',
    'chat-images:a9000000-1111-0000-0000-000000000001/fran-y.jpg',
    'chat-images:a9000000-1111-0000-0000-000000000002/fran-x.jpg',
    'group-avatars:a9000000-1111-0000-0000-000000000003/1.jpg'
  ],
  'returns own files and everything in deleted chats, but not a surviving group''s avatar'
);

select is(
  (select count(*)::int from public.conversations where id = 'a9000000-1111-0000-0000-000000000001'),
  0,
  '1:1 chats are deleted'
);

select is(
  (select count(*)::int from public.conversations where id = 'a9000000-1111-0000-0000-000000000003'),
  0,
  'groups that would be left empty are deleted'
);

select is(
  (select count(*)::int from public.conversations where id = 'a9000000-1111-0000-0000-000000000002'),
  1,
  'groups with other members survive'
);

select is(
  (select count(*)::int from public.conversation_members
   where user_id = 'a9000001-0000-0000-0000-000000000001'),
  0,
  'the user is no longer a member anywhere'
);

select is(
  (select user_id from public.conversation_members
   where conversation_id = 'a9000000-1111-0000-0000-000000000002' and role = 'admin'),
  'a9000003-0000-0000-0000-000000000001'::uuid,
  'the longest-standing member becomes admin'
);

delete from auth.users where id = 'a9000001-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from public.profiles where id = 'a9000001-0000-0000-0000-000000000001'),
  0,
  'deleting the login removes the profile'
);

select is(
  (select count(*)::int from public.profiles where id = 'a9000002-0000-0000-0000-000000000001'),
  1,
  'other users are untouched'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a9000002-0000-0000-0000-000000000001';

select throws_ok(
  $$ select * from public.prepare_account_deletion('a9000002-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'signed-in users cannot call it directly'
);

set local role anon;

select throws_ok(
  $$ select * from public.prepare_account_deletion('a9000002-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'anonymous callers cannot call it'
);

select * from finish();

rollback;
