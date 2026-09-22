insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', true), ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "car photos are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'car-photos');

create policy "users upload their own car photos"
  on storage.objects for insert
  with check (
    bucket_id = 'car-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update their own car photos"
  on storage.objects for update
  using (
    bucket_id = 'car-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete their own car photos"
  on storage.objects for delete
  using (
    bucket_id = 'car-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "users upload their own post images"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update their own post images"
  on storage.objects for update
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete their own post images"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
