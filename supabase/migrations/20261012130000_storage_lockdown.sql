update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('avatars', 'car-photos', 'post-images', 'chat-images', 'group-avatars', 'spot-photos');

update storage.buckets set public = false where id = 'post-images';

update public.posts
set image_url = split_part(
  substring(image_url from '/object/public/post-images/(.*)$'),
  '?',
  1
)
where image_url like '%/object/public/post-images/%';

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and roles = '{public}'
  loop
    execute format('alter policy %I on storage.objects to authenticated', p.policyname);
  end loop;
end;
$$;

drop policy "post images are publicly accessible" on storage.objects;

create policy "owners and people who can see the post read post images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'post-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.posts p where p.image_url = objects.name)
    )
  );

drop policy "people upload photos to Raggställen they can see" on storage.objects;

create policy "people upload their own photos to Raggställen they can see"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'spot-photos'
    and storage.filename(name) like auth.uid()::text || '-%'
    and exists (
      select 1 from public.spots s
      where s.id::text = (storage.foldername(objects.name))[1] and s.kind = 'ragg'
    )
  );
