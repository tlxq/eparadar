begin;

select plan(11);

select tests.create_user('a8000001-0000-0000-0000-000000000001', 'test-gavatar-a', 'GAvatarA');
select tests.create_user('a8000002-0000-0000-0000-000000000001', 'test-gavatar-b', 'GAvatarB');
select tests.create_user('a8000003-0000-0000-0000-000000000001', 'test-gavatar-outsider', 'GAvatarOutsider');

insert into public.conversations (id, is_group, name) values
  ('a8000000-1111-0000-0000-000000000001', true, 'Traktorgänget'),
  ('a8000000-1111-0000-0000-000000000002', false, null);

insert into public.conversation_members (conversation_id, user_id) values
  ('a8000000-1111-0000-0000-000000000001', 'a8000001-0000-0000-0000-000000000001'),
  ('a8000000-1111-0000-0000-000000000001', 'a8000002-0000-0000-0000-000000000001'),
  ('a8000000-1111-0000-0000-000000000002', 'a8000001-0000-0000-0000-000000000001'),
  ('a8000000-1111-0000-0000-000000000002', 'a8000003-0000-0000-0000-000000000001');

insert into storage.objects (bucket_id, name, owner_id) values
  ('group-avatars', 'a8000000-1111-0000-0000-000000000001/1.jpg', 'a8000001-0000-0000-0000-000000000001'),
  ('group-avatars', 'a8000000-1111-0000-0000-000000000001/2.jpg', 'a8000002-0000-0000-0000-000000000001');

select tests.login_as('a8000001-0000-0000-0000-000000000001');

select is(
  public.set_group_avatar('a8000000-1111-0000-0000-000000000001', 'a8000000-1111-0000-0000-000000000001/1.jpg'),
  null,
  'a member can set the group avatar, and there was none before'
);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'group-avatars'),
  2,
  'a member can see the group''s avatar files'
);

select throws_ok(
  $$ select public.set_group_avatar('a8000000-1111-0000-0000-000000000001',
                                    'a8000000-1111-0000-0000-000000000001/finns-inte.jpg') $$,
  'Bilden hittades inte.',
  'the avatar must point at an uploaded file'
);

select throws_ok(
  $$ select public.set_group_avatar('a8000000-1111-0000-0000-000000000002', null) $$,
  'Du är inte med i den här gruppen.',
  '1:1 chats cannot have a group avatar'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('group-avatars', 'a8000000-1111-0000-0000-000000000002/x.jpg',
             'a8000001-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'nobody can upload a group avatar for a 1:1 chat'
);

select tests.login_as('a8000002-0000-0000-0000-000000000001');

select is(
  public.set_group_avatar('a8000000-1111-0000-0000-000000000001', 'a8000000-1111-0000-0000-000000000001/2.jpg'),
  'a8000000-1111-0000-0000-000000000001/1.jpg',
  'any member can replace it and gets the old path back for cleanup'
);

select is(
  public.is_group_member('a8000000-1111-0000-0000-000000000002', 'a8000001-0000-0000-0000-000000000001'),
  false,
  'a 1:1 chat never counts as a group for the avatar rules'
);

select is(
  public.set_group_avatar('a8000000-1111-0000-0000-000000000001', null),
  'a8000000-1111-0000-0000-000000000001/2.jpg',
  'a member can remove the group avatar'
);

select tests.login_as('a8000003-0000-0000-0000-000000000001');

select is(
  (select count(*)::int from storage.objects where bucket_id = 'group-avatars'),
  0,
  'an outsider cannot see the group''s avatar files'
);

select throws_ok(
  $$ select public.set_group_avatar('a8000000-1111-0000-0000-000000000001', null) $$,
  'Du är inte med i den här gruppen.',
  'an outsider cannot change the group avatar'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('group-avatars', 'a8000000-1111-0000-0000-000000000001/x.jpg',
             'a8000003-0000-0000-0000-000000000001') $$,
  '42501',
  null,
  'an outsider cannot upload to the group''s folder'
);

select * from finish();

rollback;
