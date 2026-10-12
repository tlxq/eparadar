begin;

select plan(13);

insert into auth.users (id) values
  ('5b000001-0000-0000-0000-000000000001'),
  ('5b000002-0000-0000-0000-000000000002'),
  ('5b000003-0000-0000-0000-000000000003');

insert into public.profiles (id, username, display_name) values
  ('5b000001-0000-0000-0000-000000000001', 'test-store-alice', 'Alice'),
  ('5b000002-0000-0000-0000-000000000002', 'test-store-bob', 'Bob'),
  ('5b000003-0000-0000-0000-000000000003', 'test-store-carol', 'Carol')
on conflict (id) do update set username = excluded.username, display_name = excluded.display_name;

insert into public.friendships (requester_id, addressee_id, status) values
  ('5b000001-0000-0000-0000-000000000001', '5b000002-0000-0000-0000-000000000002', 'accepted');

insert into public.posts (author_id, body, image_url) values
  ('5b000001-0000-0000-0000-000000000001', 'Ny lack', '5b000001-0000-0000-0000-000000000001/1.jpg');

insert into storage.objects (bucket_id, name, owner_id) values
  ('post-images', '5b000001-0000-0000-0000-000000000001/1.jpg', '5b000001-0000-0000-0000-000000000001'),
  ('avatars', '5b000001-0000-0000-0000-000000000001/avatar.jpg', '5b000001-0000-0000-0000-000000000001');

insert into public.spots (id, creator_id, kind, name, lat, lng) values
  ('5b0000a1-0000-0000-0000-000000000001', '5b000001-0000-0000-0000-000000000001', 'ragg', 'Torget', 59.3, 18.1);

select is(
  (select count(*)::int from storage.buckets
    where file_size_limit is null or allowed_mime_types is null),
  0,
  'every bucket has a size limit and allowed file types'
);

select is(
  (select public from storage.buckets where id = 'post-images'),
  false,
  'post images are not in a public bucket'
);

select is(
  (select count(*)::int from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and roles <> '{authenticated}'),
  0,
  'every storage policy is for logged-in users only'
);

set local role anon;

select is((select count(*)::int from storage.objects), 0, 'a logged-out caller cannot list any files');

set local role authenticated;
set local request.jwt.claim.sub = '5b000003-0000-0000-0000-000000000003';

select is(
  (select count(*)::int from storage.objects where bucket_id = 'post-images'),
  0,
  'a stranger cannot read a post image'
);

select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars'),
  1,
  'a logged-in user can read avatars'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('post-images', '5b000001-0000-0000-0000-000000000001/2.jpg', '5b000003-0000-0000-0000-000000000003')$$,
  '42501',
  null,
  'a stranger cannot upload into someone else''s post folder'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('spot-photos', '5b0000a1-0000-0000-0000-000000000001/5b000003-0000-0000-0000-000000000003-1.jpg', '5b000003-0000-0000-0000-000000000003')$$,
  '42501',
  null,
  'a stranger cannot upload to a spot they cannot see'
);

set local request.jwt.claim.sub = '5b000002-0000-0000-0000-000000000002';

select is(
  (select count(*)::int from storage.objects where bucket_id = 'post-images'),
  1,
  'a friend can read the image of a post they can see'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('spot-photos', '5b0000a1-0000-0000-0000-000000000001/5b000001-0000-0000-0000-000000000001-1.jpg', '5b000002-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'a friend cannot upload a spot photo under someone else''s name'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('spot-photos', '5b0000a1-0000-0000-0000-000000000001/5b000002-0000-0000-0000-000000000002-1.jpg', '5b000002-0000-0000-0000-000000000002')$$,
  'a friend can upload a spot photo under their own name'
);

set local request.jwt.claim.sub = '5b000001-0000-0000-0000-000000000001';

select is(
  (select count(*)::int from storage.objects where bucket_id = 'post-images'),
  1,
  'the owner can read their own post image'
);

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('post-images', '5b000001-0000-0000-0000-000000000001/3.jpg', '5b000001-0000-0000-0000-000000000001')$$,
  'the owner can upload into their own post folder'
);

select * from finish();

rollback;
