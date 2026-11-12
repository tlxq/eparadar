revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

create function public.owns_storage_folder(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((storage.foldername(object_name))[1] = (select auth.uid())::text, false)
$$;

revoke execute on function public.owns_storage_folder(text) from public, anon;
grant execute on function public.owns_storage_folder(text) to authenticated, service_role;

alter policy "users delete their own avatar" on storage.objects
  using (bucket_id = 'avatars' and public.owns_storage_folder(name));
alter policy "users delete their own car photos" on storage.objects
  using (bucket_id = 'car-photos' and public.owns_storage_folder(name));
alter policy "users delete their own post images" on storage.objects
  using (bucket_id = 'post-images' and public.owns_storage_folder(name));
alter policy "users update their own avatar" on storage.objects
  using (bucket_id = 'avatars' and public.owns_storage_folder(name));
alter policy "users update their own car photos" on storage.objects
  using (bucket_id = 'car-photos' and public.owns_storage_folder(name));
alter policy "users update their own post images" on storage.objects
  using (bucket_id = 'post-images' and public.owns_storage_folder(name));
alter policy "users upload their own avatar" on storage.objects
  with check (bucket_id = 'avatars' and public.owns_storage_folder(name));
alter policy "users upload their own car photos" on storage.objects
  with check (bucket_id = 'car-photos' and public.owns_storage_folder(name));
alter policy "users upload their own post images" on storage.objects
  with check (bucket_id = 'post-images' and public.owns_storage_folder(name));

alter policy "owners and people who can see the post read post images" on storage.objects
  using (bucket_id = 'post-images' and (public.owns_storage_folder(name) or exists (select 1 from public.posts p where p.image_url = objects.name)));
