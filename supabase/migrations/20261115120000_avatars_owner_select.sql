-- Avatars are shown through public URLs, which a public bucket serves without
-- RLS. The broad select policy only let every logged-in user list the whole
-- bucket (and so every user id). Keep select for the owner's own folder.
drop policy "avatar images are publicly accessible" on storage.objects;

create policy "users read their own avatar"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
